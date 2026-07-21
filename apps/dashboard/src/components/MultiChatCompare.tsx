import { useState, useMemo, useCallback } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string | null;
  created_at: string;
}

interface Chat {
  id: string;
  title: string;
  model: string;
}

interface MultiChatCompareProps {
  open: boolean;
  chats: Chat[];
  currentChatId: string | null;
  messages: Message[];
  onLoadMessages: (chatId: string) => Promise<{ model: string; cwd: string } | null>;
  onClose: () => void;
}

export function MultiChatCompare({ open, chats, currentChatId, messages, onLoadMessages, onClose }: MultiChatCompareProps) {
  const [compareChatId, setCompareChatId] = useState<string | null>(null);
  const [compareMessages, setCompareMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const otherChats = useMemo(() => chats.filter((c) => c.id !== currentChatId), [chats, currentChatId]);

  const handleSelect = useCallback(async (chatId: string) => {
    setCompareChatId(chatId);
    setLoading(true);
    const result = await onLoadMessages(chatId);
    if (result) {
      setCompareMessages([]);
      try {
        const res = await fetch(`/api/providers/opencode/chats/${chatId}`);
        if (res.ok) {
          const data = await res.json();
          setCompareMessages(data.messages || []);
        }
      } catch {}
    }
    setLoading(false);
  }, [onLoadMessages]);

  if (!open) return null;

  const pairUp = (msgs1: Message[], msgs2: Message[]) => {
    const max = Math.max(msgs1.length, msgs2.length);
    const pairs: Array<[Message | null, Message | null]> = [];
    for (let i = 0; i < max; i++) {
      pairs.push([msgs1[i] || null, msgs2[i] || null]);
    }
    return pairs;
  };

  const pairs = pairUp(messages, compareMessages);
  const chat1 = chats.find((c) => c.id === currentChatId);
  const chat2 = chats.find((c) => c.id === compareChatId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-[80vh] w-full max-w-5xl flex-col rounded-lg border border-vestara-glass-border bg-vestara-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-vestara-text">Compare Chats</h2>
          <button onClick={onClose} className="text-xs text-vestara-text-dim hover:text-vestara-text">&times;</button>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <span className="text-[10px] text-vestara-text-dim">Compare with:</span>
          <select
            value={compareChatId || ''}
            onChange={(e) => handleSelect(e.target.value)}
            className="rounded border border-vestara-glass-border bg-vestara-bg px-2 py-1 text-xs text-vestara-text outline-none"
          >
            <option value="">Select a chat...</option>
            {otherChats.map((c) => (
              <option key={c.id} value={c.id}>{c.title} ({c.model})</option>
            ))}
          </select>
        </div>

        <div className="flex flex-1 gap-2 overflow-hidden">
          <div className="flex-1 overflow-auto rounded-lg border border-vestara-glass-border bg-vestara-bg p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase text-vestara-gold">{chat1?.title || 'Current'}</p>
            {pairs.map(([msg], i) => (
              msg ? (
                <div key={msg.id || i} className={`mb-2 rounded px-2 py-1 ${msg.role === 'user' ? 'bg-vestara-gold/10' : 'glass-sm'}`}>
                  <p className="text-[9px] text-vestara-text-dim mb-0.5">{msg.role === 'user' ? 'You' : 'AI'}</p>
                  <div className="text-xs text-vestara-text line-clamp-3"><MarkdownRenderer content={msg.content.slice(0, 300)} /></div>
                </div>
              ) : <div className="mb-2 h-8 rounded bg-vestara-glass/30" />
            ))}
          </div>

          <div className="flex-1 overflow-auto rounded-lg border border-vestara-glass-border bg-vestara-bg p-3">
            {compareChatId ? (
              <>
                <p className="mb-2 text-[10px] font-semibold uppercase text-vestara-blue">{chat2?.title || 'Comparison'}</p>
                {loading ? (
                  <p className="text-xs text-vestara-text-dim">Loading...</p>
                ) : (
                  pairs.map(([, msg], i) => (
                    msg ? (
                      <div key={msg.id || i} className={`mb-2 rounded px-2 py-1 ${msg.role === 'user' ? 'bg-vestara-gold/10' : 'glass-sm'}`}>
                        <p className="text-[9px] text-vestara-text-dim mb-0.5">{msg.role === 'user' ? 'You' : 'AI'}</p>
                        <div className="text-xs text-vestara-text line-clamp-3"><MarkdownRenderer content={msg.content.slice(0, 300)} /></div>
                      </div>
                    ) : <div className="mb-2 h-8 rounded bg-vestara-glass/30" />
                  ))
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-vestara-text-dim">
                Select a chat to compare
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
