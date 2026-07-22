import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChatSidebar, ChatSidebarToggle } from '../components/ChatSidebar';
import { ChatMessage, StreamingMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { TokenUsageBar } from '../components/TokenUsageBar';
import { PinnedMessages } from '../components/PinnedMessages';
import { MessageSearch } from '../components/MessageSearch';
import type { AttachedFile } from '../components/ChatInput';
import { OPENCODE_MODELS } from '@vestara/constants';

interface Conversation {
  id: string;
  title: string;
  model_id: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string | null;
  tokens: number | null;
  created_at: string;
}

type ChatView = 'empty' | 'conversation' | 'loading' | 'error';

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const TOKEN_LIMIT = 128_000;
const COST_PER_1K_INPUT = 0.00015;
const COST_PER_1K_OUTPUT = 0.00060;

const DRAFT_KEY = 'vestara_chat_draft';
const MODEL_KEY = 'vestara_chat_model';

const ALL_MODELS = [
  ...OPENCODE_MODELS.map((m) => ({ id: m.id, name: m.name, group: 'OpenCode (Free)' })),
  { id: 'openai/gpt-4o', name: 'GPT-4o', group: 'OpenAI' },
  { id: 'openai/gpt-4.1', name: 'GPT-4.1', group: 'OpenAI' },
  { id: 'openai/o3-mini', name: 'o3-mini', group: 'OpenAI' },
  { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4', group: 'Anthropic' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', group: 'Anthropic' },
  { id: 'anthropic/claude-haiku-3.5', name: 'Claude Haiku 3.5', group: 'Anthropic' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', group: 'Google' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', group: 'Google' },
];

function formatFullTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

/** Build groups of consecutive messages with the same role */
function buildMessageGroups(messages: Message[]) {
  const groups: { role: Message['role']; messages: Message[] }[] = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (last && last.role === msg.role) {
      last.messages.push(msg);
    } else {
      groups.push({ role: msg.role, messages: [msg] });
    }
  }
  return groups;
}

export function Chat() {
  const { token } = useAuth();
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Chat state
  const [view, setView] = useState<ChatView>('empty');
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [model, setModel] = useState<string>(() => localStorage.getItem(MODEL_KEY) || 'opencode/deepseek-v4-flash-free');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  // Smart scroll state
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Draft persistence
  const [draft, setDraft] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 300_000) return parsed.value;
      }
    } catch {}
    return '';
  });

  const saveDraft = useCallback((value: string) => {
    setDraft(value);
    if (value.trim()) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ value, timestamp: Date.now() }));
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  // Abort controller and streaming content ref for stale-closure safety
  const abortRef = useRef<AbortController | null>(null);
  const streamingRef = useRef('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // ---------- Smart Scroll ----------

  const checkNearBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const threshold = 200;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsNearBottom(near);
  }, []);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const onScroll = () => checkNearBottom();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [checkNearBottom]);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  // Auto-scroll only if user is near bottom
  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom(messages.length > 0 || streamingContent.length > 0);
    } else if (streamingContent) {
      setShowScrollButton(true);
    }
  }, [messages, streamingContent, isNearBottom, scrollToBottom]);

  // Hide scroll button when user scrolls back down
  useEffect(() => {
    if (isNearBottom) setShowScrollButton(false);
  }, [isNearBottom]);

  // Save model to localStorage
  useEffect(() => {
    localStorage.setItem(MODEL_KEY, model);
  }, [model]);

  // Load conversations on mount
  useEffect(() => {
    if (!token) return;
    loadConversations();
  }, [token]);

  // Auto-load conversation messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    } else {
      setMessages([]);
      setView('empty');
    }
  }, [activeConversationId]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K -> open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (messages.length > 0) setShowSearch(true);
      }
      // Escape -> cancel stream or close search
      if (e.key === 'Escape') {
        if (showSearch) setShowSearch(false);
        else if (sending) abortRef.current?.abort();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showSearch, sending]);

  async function loadConversations() {
    if (!token) return;
    setLoadingConversations(true);
    try {
      const res = await fetch('/api/conversations', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }

  async function loadMessages(conversationId: string) {
    if (!token) return;
    setLoadingMessages(true);
    setError(null);
    setView('conversation');
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const msgs = (data.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role as Message['role'],
          content: m.content,
          model: m.model || data.conversation?.model_id || null,
          tokens: m.tokens || null,
          created_at: m.created_at,
        }));
        setMessages(msgs);
      } else if (res.status === 404) {
        setError('Conversation not found');
        setView('error');
      } else {
        setError('Failed to load messages');
        setView('error');
      }
    } catch (err) {
      setError('Network error loading messages');
      setView('error');
    } finally {
      setLoadingMessages(false);
    }
  }

  async function createConversation(): Promise<string | null> {
    if (!token) return null;
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Conversation', modelId: model }),
      });
      if (res.ok) {
        const data = await res.json();
        const conv = data.conversation;
        setConversations((prev) => [conv, ...prev]);
        setActiveConversationId(conv.id);
        setMessages([]);
        setView('conversation');
        setError(null);
        return conv.id;
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
    return null;
  }

  async function deleteConversation(conversationId: string) {
    if (!token) return;
    try {
      await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
        setMessages([]);
        setView('empty');
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  }

  const selectConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
  }, []);

  const handleSend = useCallback(async (inputContent?: string) => {
    const content = (inputContent ?? draft).trim();
    if (!content || sending) return;

    let convId = activeConversationId;
    if (!convId) {
      convId = await createConversation();
      if (!convId) return;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      model: model,
      tokens: null,
      created_at: new Date().toISOString(),
    };

    if (editingMessageId) {
      const idx = messages.findIndex((m) => m.id === editingMessageId);
      if (idx >= 0) {
        const nextMsgs = messages.slice(0, idx);
        if (idx + 1 < messages.length && messages[idx + 1].role === 'assistant') {
          setMessages([...nextMsgs, userMsg]);
        } else {
          setMessages([...nextMsgs, userMsg, ...messages.slice(idx + 1)]);
        }
      }
    } else {
      setMessages((prev) => [...prev, userMsg]);
    }

    setDraft('');
    saveDraft('');
    setSending(true);
    setStreamingContent('');
    streamingRef.current = '';
    setEditingMessageId(null);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conversationId: convId,
          content,
          model,
        }),
        signal: abort.signal,
      });

      if (!res.ok) {
        let errMsg = 'Request failed';
        try {
          const body = await res.json();
          errMsg = body.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let assistantId = '';
      let accumulatedContent = '';
      let receivedConversationId = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data) continue;

          let parsed: any;
          try {
            parsed = JSON.parse(data);
          } catch {
            accumulatedContent += data;
            streamingRef.current = accumulatedContent;
            setStreamingContent(accumulatedContent);
            continue;
          }

          if (parsed.conversationId && !receivedConversationId) {
            receivedConversationId = true;
          } else if (parsed.done) {
            assistantId = parsed.messageId || '';
          } else if (parsed.error) {
            throw new Error(parsed.error);
          } else if (parsed.content !== undefined) {
            accumulatedContent += parsed.content;
            streamingRef.current = accumulatedContent;
            setStreamingContent(accumulatedContent);
          }
        }
      }

      if (accumulatedContent) {
        const assistantMsg: Message = {
          id: assistantId || crypto.randomUUID(),
          role: 'assistant',
          content: accumulatedContent,
          model,
          tokens: null,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingContent('');
        loadConversations();
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        const partialContent = streamingRef.current;
        if (partialContent) {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: partialContent + '\n\n*[Response cancelled]*',
              model,
              tokens: null,
              created_at: new Date().toISOString(),
            },
          ]);
          setStreamingContent('');
          streamingRef.current = '';
        }
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Error: ${err instanceof Error ? err.message : 'Request failed'}`,
          model: null,
          tokens: null,
          created_at: new Date().toISOString(),
        },
      ]);
      setStreamingContent('');
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }, [token, headers, draft, saveDraft, sending, activeConversationId, createConversation, messages, editingMessageId, model]);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const regenerateLastMessage = useCallback(() => {
    if (sending || messages.length === 0) return;

    const lastAssistantIdx = messages.length - 1;
    if (messages[lastAssistantIdx].role !== 'assistant') return;

    let userIdx = lastAssistantIdx - 1;
    while (userIdx >= 0 && messages[userIdx].role !== 'user') {
      userIdx--;
    }
    if (userIdx < 0) return;

    const userContent = messages[userIdx].content;
    setMessages((prev) => prev.slice(0, lastAssistantIdx));
    handleSend(userContent);
  }, [sending, messages, handleSend]);

  // Token calculations
  const totalTokens = useMemo(() => {
    const msgTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    return msgTokens + estimateTokens(streamingContent);
  }, [messages, streamingContent]);

  const tokenPercentage = useMemo(() => Math.min((totalTokens / TOKEN_LIMIT) * 100, 100), [totalTokens]);

  const estimatedCost = useMemo(() => {
    const inputTokens = messages.filter((m) => m.role === 'user').reduce((sum, m) => sum + estimateTokens(m.content), 0);
    const outputTokens = messages.filter((m) => m.role === 'assistant').reduce((sum, m) => sum + estimateTokens(m.content), 0);
    return (inputTokens / 1000) * COST_PER_1K_INPUT + (outputTokens / 1000) * COST_PER_1K_OUTPUT;
  }, [messages]);

  // Message grouping
  const messageGroups = useMemo(() => buildMessageGroups(messages), [messages]);

  const startEdit = useCallback((messageId: string, _content: string) => {
    setEditingMessageId(messageId);
    saveDraft(_content);
    return _content;
  }, [saveDraft]);

  const togglePin = useCallback((messageId: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }, []);

  const handleReact = useCallback((_messageId: string, _reaction: 'like' | 'dislike' | null) => {
    // Future: sync to backend
  }, []);

  const jumpToMessage = useCallback((messageId: string) => {
    const el = messageRefs.current.get(messageId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const setMessageRef = useCallback((messageId: string) => (el: HTMLDivElement | null) => {
    if (el) messageRefs.current.set(messageId, el);
    else messageRefs.current.delete(messageId);
  }, []);

  // Copy conversation as markdown
  const copyConversation = useCallback(() => {
    const lines: string[] = [];
    for (const msg of messages) {
      const prefix = msg.role === 'user' ? '**You**' : '**Assistant**';
      lines.push(`### ${prefix} (${model})`, '', msg.content, '', '---', '');
    }
    const md = lines.join('\n');
    navigator.clipboard.writeText(md).catch(() => {});
  }, [messages, model]);

  const handleSuggestionClick = useCallback(async (text: string) => {
    saveDraft(text);
    // Small delay to let state settle, then send
    setTimeout(() => handleSend(text), 50);
  }, [saveDraft, handleSend]);

  // Group models for selector
  const modelGroups = useMemo(() => {
    const groups: Record<string, typeof ALL_MODELS> = {};
    for (const m of ALL_MODELS) {
      (groups[m.group] ||= []).push(m);
    }
    return groups;
  }, []);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-vestara-glass-border px-4 py-2.5 bg-vestara-surface/80 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <ChatSidebarToggle show={sidebarOpen} onClick={() => setSidebarOpen(true)} />
            <h1 className="text-sm font-semibold text-vestara-text">AI Chat</h1>
            {loadingMessages && (
              <span className="flex items-center gap-1.5 text-[10px] text-vestara-text-dim">
                <span className="inline-flex gap-0.5">
                  <span className="h-1 w-1 rounded-full bg-vestara-text-dim animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1 w-1 rounded-full bg-vestara-text-dim animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1 w-1 rounded-full bg-vestara-text-dim animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                Loading
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <TokenUsageBar
              totalTokens={totalTokens}
              percentage={tokenPercentage}
              estimatedCost={estimatedCost}
              limit={TOKEN_LIMIT}
            />

            {/* Pinned messages */}
            <PinnedMessages
              messages={messages}
              pinnedIds={pinnedIds}
              onTogglePin={togglePin}
              onJumpTo={jumpToMessage}
            />

            {/* Search messages */}
            {messages.length > 0 && (
              <button
                onClick={() => setShowSearch(true)}
                className="rounded px-1.5 py-0.5 text-[10px] text-vestara-text-dim hover:text-vestara-text transition-colors"
                title="Search messages (Ctrl+K)"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </button>
            )}

            {/* Copy conversation */}
            {messages.length > 0 && (
              <button
                onClick={copyConversation}
                className="rounded px-1.5 py-0.5 text-[10px] text-vestara-text-dim hover:text-vestara-text transition-colors"
                title="Copy conversation as markdown"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            )}

            {/* Model Selector */}
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded border border-vestara-glass-border bg-vestara-bg px-2 py-1 text-[11px] text-vestara-text outline-none focus:border-vestara-gold/50 max-w-[160px]"
              disabled={sending}
            >
              {Object.entries(modelGroups).map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            {activeConversationId && (
              <button
                onClick={() => {
                  if (window.confirm('Delete this conversation?')) {
                    deleteConversation(activeConversationId);
                  }
                }}
                className="rounded px-1.5 py-0.5 text-[10px] text-vestara-text-dim hover:text-red-400 transition-colors"
                title="Delete conversation"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div ref={messagesContainerRef} className="flex-1 overflow-auto relative">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-vestara-glass-border px-4 py-2.5">
          <div className="flex items-center gap-3">
            <ChatSidebarToggle show={sidebarOpen} onClick={() => setSidebarOpen(true)} />
            <h1 className="text-sm font-semibold text-vestara-text">AI Chat</h1>
            {loadingMessages && (
              <span className="flex items-center gap-1.5 text-[10px] text-vestara-text-dim">
                <span className="inline-flex gap-0.5">
                  <span className="h-1 w-1 rounded-full bg-vestara-text-dim animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1 w-1 rounded-full bg-vestara-text-dim animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1 w-1 rounded-full bg-vestara-text-dim animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                Loading
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <TokenUsageBar
              totalTokens={totalTokens}
              percentage={tokenPercentage}
              estimatedCost={estimatedCost}
              limit={TOKEN_LIMIT}
            />

            {/* Pinned messages */}
            <PinnedMessages
              messages={messages}
              pinnedIds={pinnedIds}
              onTogglePin={togglePin}
              onJumpTo={jumpToMessage}
            />

            {/* Search messages */}
            {messages.length > 0 && (
              <button
                onClick={() => setShowSearch(true)}
                className="rounded px-1.5 py-0.5 text-[10px] text-vestara-text-dim hover:text-vestara-text transition-colors"
                title="Search messages (Ctrl+K)"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </button>
            )}

            {/* Copy conversation */}
            {messages.length > 0 && (
              <button
                onClick={copyConversation}
                className="rounded px-1.5 py-0.5 text-[10px] text-vestara-text-dim hover:text-vestara-text transition-colors"
                title="Copy conversation as markdown"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            )}

            {/* Model Selector */}
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded border border-vestara-glass-border bg-vestara-bg px-2 py-1 text-[11px] text-vestara-text outline-none focus:border-vestara-gold/50 max-w-[160px]"
              disabled={sending}
            >
              {Object.entries(modelGroups).map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            {activeConversationId && (
              <button
                onClick={() => {
                  if (window.confirm('Delete this conversation?')) {
                    deleteConversation(activeConversationId);
                  }
                }}
                className="rounded px-1.5 py-0.5 text-[10px] text-vestara-text-dim hover:text-red-400 transition-colors"
                title="Delete conversation"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div ref={messagesContainerRef} className="flex-1 overflow-auto relative">
          {view === 'empty' && !loadingConversations && (
            <div className="flex h-full flex-col items-center justify-center px-4">
              <div className="max-w-md text-center space-y-5">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-vestara-gold/20 to-vestara-gold/5 border border-vestara-gold/20">
                  <svg className="h-8 w-8 text-vestara-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-vestara-text">What can I help you with?</h2>
                <p className="text-sm text-vestara-text-muted">
                  I can write code, explain concepts, debug issues, and more.
                  {conversations.length > 0 && ' Select a conversation from the sidebar or start fresh below.'}
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {[
                    { text: 'Write a React component', icon: '⚛️', prompt: 'Write a reusable React component with TypeScript and Tailwind CSS' },
                    { text: 'Explain this code', icon: '🔍', prompt: 'Explain how this code pattern works and its tradeoffs' },
                    { text: 'Debug an issue', icon: '🐛', prompt: 'Help me debug a technical issue step by step' },
                    { text: 'Optimize performance', icon: '⚡', prompt: 'Review this code for performance improvements' },
                    { text: 'Write tests', icon: '🧪', prompt: 'Write comprehensive unit tests for this module' },
                    { text: 'Design system', icon: '🎨', prompt: 'Help me design a consistent design system architecture' },
                  ].map((suggestion) => (
                    <button
                      key={suggestion.text}
                      onClick={() => handleSuggestionClick(suggestion.prompt)}
                      className="rounded-lg border border-vestara-glass-border bg-vestara-glass px-3 py-1.5 text-xs text-vestara-text-muted hover:text-vestara-text hover:border-vestara-gold/30 hover:bg-vestara-gold/5 transition-all active:scale-[0.97]"
                    >
                      {suggestion.icon} {suggestion.text}
                    </button>
                  ))}
                </div>
                {messages.length === 0 && conversations.length > 0 && (
                  <p className="text-[10px] text-vestara-text-dim/50">
                    Tip: Press <kbd className="rounded border border-vestara-glass-border px-1 py-0.5 font-mono text-vestara-text-dim">Ctrl+K</kbd> to search conversations
                  </p>
                )}
              </div>
            </div>
          )}

          {view === 'loading' && (
            <div className="flex h-full items-center justify-center">
              <div className="space-y-3 w-full max-w-lg px-8">
                <MessageSkeleton />
                <MessageSkeleton user />
                <MessageSkeleton />
              </div>
            </div>
          )}

          {view === 'error' && (
            <div className="flex h-full items-center justify-center">
              <div className="space-y-3 text-center max-w-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
                  <span className="text-lg">⚠️</span>
                </div>
                <p className="text-sm text-red-400">{error || 'Something went wrong'}</p>
                <button
                  onClick={() => activeConversationId ? loadMessages(activeConversationId) : setView('empty')}
                  className="rounded-lg border border-vestara-glass-border bg-vestara-glass px-4 py-2 text-xs text-vestara-text hover:bg-vestara-gold/10 hover:border-vestara-gold/30 transition-all"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {view === 'conversation' && (
            <div className="mx-auto max-w-3xl space-y-1 px-4 py-6">
              {messages.length === 0 && !loadingMessages ? (
                <div className="flex h-32 items-center justify-center">
                  <p className="text-sm text-vestara-text-dim animate-fadeIn">No messages yet. Type something below to start.</p>
                </div>
              ) : (
                messageGroups.map((group, gi) => (
                  <div key={gi} className="animate-fadeInSlideUp">
                    {group.messages.map((msg, mi) => {
                      const isFirstInGroup = mi === 0;
                      return (
                        <div
                          key={msg.id}
                          ref={isFirstInGroup ? setMessageRef(msg.id) : undefined}
                          className={mi > 0 ? '-mt-2' : ''}
                        >
                          <ChatMessage
                            message={msg}
                            onEdit={msg.role === 'user' ? startEdit : undefined}
                            onReact={handleReact}
                            isPinned={pinnedIds.has(msg.id)}
                            onTogglePin={togglePin}
                            isEditing={editingMessageId === msg.id}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))
              )}

              {streamingContent && (
                <div className="animate-fadeIn">
                  <StreamingMessage content={streamingContent} />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {loadingConversations && conversations.length === 0 && !activeConversationId && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center space-y-2">
                <div className="inline-flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-vestara-gold/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 rounded-full bg-vestara-gold/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 rounded-full bg-vestara-gold/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <p className="text-sm text-vestara-text-dim">Loading conversations...</p>
              </div>
            </div>
          )}

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button
              onClick={() => { scrollToBottom(); setShowScrollButton(false); }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-vestara-gold/30 bg-vestara-surface px-3 py-1.5 text-[10px] text-vestara-gold shadow-lg hover:bg-vestara-gold/10 transition-all animate-fadeIn z-10"
            >
              <span className="flex items-center gap-1.5">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="7 13 12 18 17 13" />
                  <polyline points="7 6 12 11 17 6" />
                </svg>
                New content below
              </span>
            </button>
          )}
        </div>

        {/* Input Area */}
        <ChatInput
          value={draft}
          onChange={saveDraft}
          onSend={() => handleSend()}
          onCancel={cancelStream}
          loading={sending}
          streaming={!!streamingContent}
          attachedFiles={attachedFiles}
          onAttachFiles={setAttachedFiles}
          onRemoveFile={(name) => setAttachedFiles((prev) => prev.filter((f) => f.name !== name))}
          editing={!!editingMessageId}
          placeholder="Ask Vestara AI... (Ctrl+K to search)"
        />

        {/* Regenerate button */}
        {!sending && !streamingContent && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && (
          <div className="flex items-center justify-center gap-3 pb-2 pt-1">
            <button
              onClick={regenerateLastMessage}
              className="flex items-center gap-1.5 rounded-lg border border-vestara-glass-border bg-vestara-glass px-3 py-1.5 text-[10px] text-vestara-text-dim hover:text-vestara-text hover:border-vestara-gold/30 transition-all active:scale-[0.97]"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Regenerate
            </button>
            <span className="text-[8px] text-vestara-text-dim/30">·</span>
            <span className="text-[9px] text-vestara-text-dim/50">{formatFullTime(messages[messages.length - 1].created_at)}</span>
          </div>
        )}
      </div>

      {/* Message Search Modal */}
      {showSearch && (
        <MessageSearch
          messages={messages}
          onJumpTo={jumpToMessage}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}

/** Skeleton placeholder while messages load */
function MessageSkeleton({ user }: { user?: boolean }) {
  return (
    <div className={`flex gap-3 ${user ? 'flex-row-reverse' : ''} animate-pulse`}>
      <div className={`h-7 w-7 shrink-0 rounded-full ${user ? 'bg-vestara-gold/20' : 'bg-vestara-blue/20'}`} />
      <div className={`flex flex-col gap-2 ${user ? 'items-end' : 'items-start'} flex-1`}>
        <div className="h-2 w-16 rounded bg-white/5" />
        <div className={`rounded-xl border border-vestara-glass-border bg-vestara-surface/50 px-4 py-3 space-y-2 ${user ? 'max-w-[70%]' : 'max-w-[80%]'}`}>
          <div className="h-3 w-full rounded bg-white/5" />
          <div className="h-3 w-3/4 rounded bg-white/5" />
          <div className="h-3 w-1/2 rounded bg-white/5" />
        </div>
      </div>
    </div>
  );
}
