import { useState, useEffect, useRef, useCallback } from 'react';

interface Chat {
  id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string | null;
  created_at: string;
}

interface BrowserEntry {
  name: string;
  path: string;
  type: string;
  icon: string;
}

const defaultModels = [
  { id: 'opencode/deepseek-v4-flash-free', name: 'DeepSeek V4 Flash (Free)' },
  { id: 'opencode/mimo-v2.5-free', name: 'Mimo V2.5 (Free)' },
  { id: 'opencode/nemotron-3-ultra-free', name: 'Nemotron 3 Ultra (Free)' },
  { id: 'opencode/north-mini-code-free', name: 'North Mini Code (Free)' },
  { id: 'opencode/big-pickle', name: 'Big Pickle' },
];

export function OpenCodePage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('opencode/deepseek-v4-flash-free');
  const [cwd, setCwd] = useState('/home/eddie/workspace');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserPath, setBrowserPath] = useState('');
  const [browserEntries, setBrowserEntries] = useState<BrowserEntry[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadBrowserDir = useCallback(async (path: string) => {
    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        setBrowserPath(data.path || '');
        setBrowserEntries((data.entries || []).filter((e: BrowserEntry) => e.type === 'directory'));
      }
    } catch {}
  }, []);

  const openBrowser = (currentPath?: string) => {
    loadBrowserDir(currentPath || '');
    setShowBrowser(true);
  };

  const selectBrowserDir = (path: string) => {
    setCwd(path);
    setShowBrowser(false);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (activeChatId) {
      loadMessages(activeChatId);
    }
  }, [activeChatId]);

  const loadChats = async () => {
    try {
      const res = await fetch('/api/providers/opencode/chats');
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats);
      }
    } catch {}
  };

  const loadMessages = async (chatId: string) => {
    try {
      const res = await fetch(`/api/providers/opencode/chats/${chatId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setModel(data.chat.model);
      }
    } catch {}
  };

  const createChat = async () => {
    try {
      const res = await fetch('/api/providers/opencode/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      });
      if (res.ok) {
        const data = await res.json();
        setChats((prev) => [data.chat, ...prev]);
        setActiveChatId(data.chat.id);
        setMessages([]);
      }
    } catch {}
  };

  const deleteChat = async (chatId: string) => {
    try {
      await fetch(`/api/providers/opencode/chats/${chatId}`, { method: 'DELETE' });
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([]);
      }
    } catch {}
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    let chatId = activeChatId;

    // Auto-create chat if none active
    if (!chatId) {
      try {
        const res = await fetch('/api/providers/opencode/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model }),
        });
        if (res.ok) {
          const data = await res.json();
          setChats((prev) => [data.chat, ...prev]);
          chatId = data.chat.id;
          setActiveChatId(chatId);
        }
      } catch {
        return;
      }
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      model,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`/api/providers/opencode/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMsg.content, model, cwd }),
      });

      const data = await res.json();
      if (res.ok) {
        const assistantMsg: Message = {
          id: data.assistantMessageId,
          role: 'assistant',
          content: data.response,
          model,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        // Refresh chat list to get updated title/timestamp
        loadChats();
      } else {
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Error: ${data.error}`,
          model: null,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err) {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Request failed'}`,
        model: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full gap-0 overflow-hidden rounded-lg border border-vestara-glass-border">
      {/* Chat list sidebar */}
      {showSidebar && (
        <div className="flex w-64 flex-col border-r border-vestara-glass-border bg-vestara-surface/30">
          <div className="flex items-center justify-between border-b border-vestara-glass-border p-3">
            <span className="text-sm font-semibold text-vestara-text">Chats</span>
            <button onClick={createChat} className="text-vestara-text-muted hover:text-vestara-gold text-lg leading-none">+</button>
          </div>
          <div className="flex-1 overflow-auto">
            {chats.length === 0 && (
              <p className="p-3 text-xs text-vestara-text-dim">No chats yet</p>
            )}
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={`group flex cursor-pointer items-center justify-between border-b border-vestara-glass-border px-3 py-2.5 transition-colors ${
                  activeChatId === chat.id
                    ? 'bg-vestara-gold/10 text-vestara-text'
                    : 'text-vestara-text-muted hover:bg-vestara-glass hover:text-vestara-text'
                }`}
              >
                <span className="truncate text-xs">{chat.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                  className="hidden text-vestara-text-dim hover:text-red-400 group-hover:inline text-xs"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-vestara-bg">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-vestara-glass-border px-4 py-2.5">
          <button onClick={() => setShowSidebar(!showSidebar)} className="text-vestara-text-muted hover:text-vestara-text text-sm">
            {showSidebar ? '<' : '>'}
          </button>
          <span className="text-sm font-semibold text-vestara-text">OpenCode</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-vestara-text-dim">cwd:</span>
            <input
              type="text"
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="/path/to/project"
              className="w-64 rounded border border-vestara-glass-border bg-vestara-bg px-2 py-1 text-xs text-vestara-text outline-none focus:border-vestara-gold/50"
            />
            <button
              onClick={() => openBrowser(cwd)}
              className="px-2 py-1 rounded border border-vestara-glass-border bg-vestara-bg text-xs text-vestara-text-muted hover:text-vestara-text hover:bg-vestara-glass"
              title="Browse directories"
            >
              ...
            </button>
          </div>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded border border-vestara-glass-border bg-vestara-bg px-2 py-1 text-xs text-vestara-text outline-none"
          >
            {defaultModels.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.length === 0 && !loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-lg text-vestara-text-muted">OpenCode AI Agent</p>
                <p className="mt-1 text-sm text-vestara-text-dim">
                  Ask me to write code, refactor, debug, or explain anything.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[
                    'Explain this codebase',
                    'Write a REST API',
                    'Fix the failing test',
                    'Refactor auth module',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="glass-sm px-3 py-1.5 text-xs text-vestara-text-muted hover:text-vestara-text"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-vestara-gold/20 text-vestara-text'
                    : 'glass-sm text-vestara-text'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="glass-sm flex items-center gap-2 px-4 py-2.5 text-sm text-vestara-blue">
                <span className="ai-active">●</span>
                <span>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-vestara-glass-border p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask OpenCode to write, refactor, or explain code..."
              className="flex-1 rounded-lg border border-vestara-glass-border bg-vestara-bg px-4 py-2.5 text-sm text-vestara-text placeholder-vestara-text-dim outline-none focus:border-vestara-gold/50"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="btn-gold px-4 py-2.5 text-sm disabled:opacity-50"
            >
              {loading ? 'Running...' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      {/* Directory Browser Modal */}
      {showBrowser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-white">Select Working Directory</h2>
            <div className="flex items-center gap-2 mb-4 text-sm">
              <span className="text-gray-400">Current:</span>
              <span className="text-white font-mono">{browserPath || '~'}</span>
            </div>
            <div className="flex-1 overflow-y-auto border border-[#1e1e2e] rounded-lg bg-[#0a0a12] min-h-[300px]">
              {browserPath && (
                <button
                  onClick={() => {
                    const parent = browserPath.substring(0, browserPath.lastIndexOf('/')) || '';
                    loadBrowserDir(parent);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-white/5 border-b border-[#1e1e2e] flex items-center gap-2"
                >
                  <span>..</span>
                  <span className="text-gray-500">Parent directory</span>
                </button>
              )}
              {browserEntries.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                  No subdirectories
                </div>
              ) : (
                browserEntries.map((entry) => (
                  <button
                    key={entry.path}
                    onClick={() => loadBrowserDir(entry.path)}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 border-b border-[#1e1e2e] flex items-center gap-2"
                  >
                    <span>{entry.icon || '📁'}</span>
                    <span className="font-mono">{entry.name}</span>
                  </button>
                ))
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowBrowser(false)}
                className="flex-1 px-4 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg hover:bg-[#2a2a3e] text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => selectBrowserDir(browserPath)}
                className="flex-1 px-4 py-2 bg-[#4a9eff] rounded-lg hover:bg-[#3a8eef] text-white"
              >
                Select
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
