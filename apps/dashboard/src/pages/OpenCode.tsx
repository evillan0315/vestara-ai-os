import { useState, useEffect, useRef } from 'react';

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
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        body: JSON.stringify({ content: userMsg.content, model }),
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
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="ml-auto rounded border border-vestara-glass-border bg-vestara-bg px-2 py-1 text-xs text-vestara-text outline-none"
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
    </div>
  );
}
