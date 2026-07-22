import { useState, useRef, useCallback, useMemo, useEffect } from 'react';

export interface Chat {
  id: string;
  title: string;
  model: string;
  cwd: string;
  agent: string;
  custom_instructions: string | null;
  fallback_models: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string | null;
  created_at: string;
}

export interface AttachedFile {
  name: string;
  path: string;
  content: string;
  size: number;
}

const AGENT_MODES = ['build', 'plan', 'explore', 'general'] as const;
export type AgentMode = typeof AGENT_MODES[number];

const TOKEN_LIMIT = 128_000;
const COST_PER_1K_INPUT = 0.00015;
const COST_PER_1K_OUTPUT = 0.00060;
const DRAFT_KEY = 'vestara_opencode_draft';

const fetchCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30_000;
const pendingFetches = new Map<string, Promise<unknown>>();

async function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = fetchCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data as T;

  const pending = pendingFetches.get(key);
  if (pending) return pending as Promise<T>;

  const promise = fetcher().then((data) => {
    fetchCache.set(key, { data, timestamp: Date.now() });
    pendingFetches.delete(key);
    return data;
  }).catch((err) => {
    pendingFetches.delete(key);
    throw err;
  });

  pendingFetches.set(key, promise);
  return promise;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function useOpenCodeChat(token: string | null) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [agent, setAgent] = useState<AgentMode>('build');
  const [customInstructions, setCustomInstructions] = useState('');
  const [webSearch, setWebSearch] = useState(false);
  const [fallbackModels, setFallbackModels] = useState<string[]>([]);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const [draft, setDraft] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 300_000) {
          return parsed.value as string;
        }
        localStorage.removeItem(DRAFT_KEY);
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

  const loadChats = useCallback(async (selectedProjectId?: string | null) => {
    try {
      const url = selectedProjectId
        ? `/api/providers/opencode/chats?projectId=${selectedProjectId}`
        : '/api/providers/opencode/chats';
      const data = await cachedFetch<{ chats: Chat[] }>(url, async () => {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load chats');
        return res.json();
      });
      setChats(data.chats);
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  }, [token]);

  const loadMessages = useCallback(async (chatId: string): Promise<{ model: string; cwd: string; agent: string; customInstructions: string; fallbackModels: string[] } | null> => {
    try {
      const data = await cachedFetch<{ chat: any; messages: Message[] }>(
        `/api/providers/opencode/chats/${chatId}`,
        async () => {
          const res = await fetch(`/api/providers/opencode/chats/${chatId}`, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) throw new Error('Failed');
          return res.json();
        },
      );
      setMessages(data.messages);
      const chat = data.chat;
      if (chat.agent) setAgent(chat.agent);
      if (chat.custom_instructions) setCustomInstructions(chat.custom_instructions);
      if (chat.fallback_models) { try { setFallbackModels(JSON.parse(chat.fallback_models)); } catch { setFallbackModels([]); } }
      return { model: chat.model, cwd: chat.cwd || '', agent: chat.agent || 'build', customInstructions: chat.custom_instructions || '', fallbackModels: chat.fallback_models ? JSON.parse(chat.fallback_models) : [] };
    } catch (err) {
      console.error('Failed to load messages:', err);
      return null;
    }
  }, [token]);

  const createChat = useCallback(async (model: string, cwd: string, selectedProjectId?: string | null, agentMode?: AgentMode, customInst?: string, fallbacks?: string[]) => {
    try {
      const res = await fetch('/api/providers/opencode/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ model, cwd, projectId: selectedProjectId, agent: agentMode || agent, customInstructions: customInst || customInstructions, fallbackModels: fallbacks || fallbackModels }),
      });
      if (res.ok) {
        const data = await res.json();
        setChats((prev) => [data.chat, ...prev]);
        setActiveChatId(data.chat.id);
        setMessages([]);
        return data.chat.id;
      }
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
    return null;
  }, [token, agent, customInstructions, fallbackModels]);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      await fetch(`/api/providers/opencode/chats/${chatId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChatId === chatId) { setActiveChatId(null); setMessages([]); }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  }, [token, activeChatId]);

  const renameChat = useCallback(async (chatId: string, title: string) => {
    try {
      const res = await fetch(`/api/providers/opencode/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, title } : c));
      }
    } catch (err) {
      console.error('Failed to rename chat:', err);
    }
  }, [token]);

  const buildFileContext = (files: AttachedFile[]): string => {
    if (files.length === 0) return '';
    return '\n\n---\nAttached files:\n' + files.map((f) =>
      `File: ${f.path || f.name}\n\`\`\`\n${f.content}\n\`\`\``
    ).join('\n\n') + '\n---\n';
  };

  const sendMessage = useCallback(async (content: string, model: string, cwd: string, selectedProjectId?: string | null, attachedFiles?: AttachedFile[], editMessageId?: string | null) => {
    if (!content.trim() || loading) return;
    let chatId = activeChatId;
    if (!chatId) { chatId = await createChat(model, cwd, selectedProjectId); if (!chatId) return; }

    const fullContent = content + buildFileContext(attachedFiles || []);
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: fullContent, model, created_at: new Date().toISOString() };

    if (editMessageId) {
      const idx = messages.findIndex((m) => m.id === editMessageId);
      if (idx >= 0) setMessages((prev) => [...prev.slice(0, idx), userMsg]);
    } else setMessages((prev) => [...prev, userMsg]);

    setStreamingContent(''); setLoading(true); setEditingMessageId(null);
    const abort = new AbortController(); abortRef.current = abort;

    try {
      const res = await fetch(`/api/providers/opencode/chats/${chatId}/messages/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: fullContent, model, cwd, agent, customInstructions: customInstructions || undefined, webSearch, fallbackModels: fallbackModels.length > 0 ? fallbackModels : undefined }),
        signal: abort.signal,
      });
      if (!res.ok) {
        let errMsg = 'Request failed';
        try { const body = await res.json(); errMsg = body.error || errMsg; } catch { /* non-JSON */ }
        throw new Error(errMsg);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No body');
      const decoder = new TextDecoder();
      let buffer = '', assistantId = '', acc = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const s = line.slice(6);
          let parsed: any;
          try { parsed = JSON.parse(s); } catch { acc += s; setStreamingContent(acc); continue; }
          if (parsed.done) { assistantId = parsed.assistantMessageId; }
          else if (parsed.error) { throw new Error(parsed.error); }
          else if (typeof parsed === 'string') { acc += parsed; setStreamingContent(acc); }
        }
      }

      if (assistantId) {
        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: acc, model, created_at: new Date().toISOString() }]);
        setStreamingContent(''); loadChats(selectedProjectId);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: `Error: ${err instanceof Error ? err.message : 'Failed'}`, model: null, created_at: new Date().toISOString() }]);
      setStreamingContent('');
    } finally { setLoading(false); abortRef.current = null; }
  }, [token, loading, activeChatId, createChat, loadChats, messages, agent, customInstructions, webSearch, fallbackModels]);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    if (streamingContent) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: streamingContent + '\n\n[Response cancelled]', model: null, created_at: new Date().toISOString() }]);
      setStreamingContent('');
    }
    setLoading(false);
  }, [streamingContent]);

  const regenerateLastMessage = useCallback(async (model: string, cwd: string, selectedProjectId?: string | null) => {
    if (loading || messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'assistant') return;

    const previousUserMsg = messages.slice().reverse().find((m) => m.role === 'user');
    if (!previousUserMsg) return;

    setMessages((prev) => prev.slice(0, -1));
    await sendMessage(previousUserMsg.content, model, cwd, selectedProjectId);
  }, [loading, messages, sendMessage]);

  const exportChatAsMarkdown = useCallback((chat: Chat, msgs: Message[]): string => {
    const lines = [`# ${chat.title}`, `- **Model**: ${chat.model}`, `- **Agent**: ${chat.agent || 'build'}`, `- **CWD**: ${chat.cwd}`];
    if (chat.custom_instructions) lines.push(`- **Custom Instructions**: ${chat.custom_instructions}`);
    lines.push(`- **Created**: ${chat.created_at}`, `- **Updated**: ${chat.updated_at}`, '', '---', '');
    for (const msg of msgs) { lines.push(`### ${msg.role === 'user' ? '**You**' : '**Assistant**'}`, '', msg.content, '', '---', ''); }
    return lines.join('\n');
  }, []);

  const exportChatAsJSON = useCallback((chat: Chat, msgs: Message[]): string => JSON.stringify({ chat, messages: msgs }, null, 2), []);

  const importChatFromJSON = useCallback(async (jsonStr: string): Promise<string | null> => {
    try {
      const data = JSON.parse(jsonStr);
      const chat = data.chat; const msgs = data.messages || [];
      const chatId = await createChat(chat.model || 'opencode/deepseek-v4-flash-free', chat.cwd || '', null, chat.agent || 'build', chat.custom_instructions || '', chat.fallback_models || []);
      if (!chatId) return null;
      for (const msg of msgs) { if (msg.role === 'user' || msg.role === 'assistant') { await fetch(`/api/providers/opencode/chats/${chatId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ content: msg.content, model: msg.model || chat.model }) }).catch((err) => console.error('Failed to import message:', err)); } }
      return chatId;
    } catch (err) {
      console.error('Failed to import chat from JSON:', err);
      return null;
    }
  }, [token, createChat]);

  const importChatFromMarkdown = useCallback(async (mdContent: string): Promise<string | null> => {
    const model = mdContent.match(/\*\*Model\*\*:\s*(.+)/)?.[1]?.trim() || 'opencode/deepseek-v4-flash-free';
    const chatId = await createChat(model, ''); if (!chatId) return null;
    const regex = /### \*\*(You|Assistant)\*\*\n\n([\s\S]*?)(?=\n### \*\*|\n---\n|$)/g; let m;
    while ((m = regex.exec(mdContent)) !== null) { const content = m[2].trim(); if (content) { await fetch(`/api/providers/opencode/chats/${chatId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ content, model }) }).catch((err) => console.error('Failed to import message:', err)); } }
    return chatId;
  }, [token, createChat]);

  const startEdit = useCallback((messageId: string, _content: string) => { setEditingMessageId(messageId); return _content; }, []);

  const togglePin = useCallback((messageId: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId); else next.add(messageId);
      return next;
    });
  }, []);

  const handleReact = useCallback((_messageId: string, _reaction: 'like' | 'dislike' | null) => {
    /* Could sync to backend */
  }, []);

  return {
    chats, setChats, activeChatId, setActiveChatId, messages, setMessages, loading, streamingContent,
    editingMessageId, setEditingMessageId, agent, setAgent, customInstructions, setCustomInstructions,
    webSearch, setWebSearch, fallbackModels, setFallbackModels, totalTokens, tokenPercentage, estimatedCost,
    pinnedIds, togglePin, handleReact, saveDraft, draft,
    loadChats, loadMessages, createChat, deleteChat, renameChat, sendMessage, cancelStream, regenerateLastMessage,
    exportChatAsMarkdown, exportChatAsJSON, importChatFromJSON, importChatFromMarkdown, startEdit, AGENT_MODES,
  };
}
