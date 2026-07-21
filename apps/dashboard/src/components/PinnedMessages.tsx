import { useState, useMemo, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string | null;
  created_at: string;
}

interface PinnedMessagesProps {
  messages: Message[];
  pinnedIds: Set<string>;
  onTogglePin: (messageId: string) => void;
  onJumpTo: (messageId: string) => void;
}

export function PinnedMessages({ messages, pinnedIds, onTogglePin, onJumpTo }: PinnedMessagesProps) {
  const [showPanel, setShowPanel] = useState(false);

  const pinned = useMemo(() => messages.filter((m) => pinnedIds.has(m.id)), [messages, pinnedIds]);

  if (pinned.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
          showPanel ? 'bg-vestara-gold/15 text-vestara-gold border border-vestara-gold/20' : 'text-vestara-text-dim hover:text-vestara-text border border-transparent'
        }`}
        title="Pinned messages"
      >
        📌 {pinned.length}
      </button>

      {showPanel && (
        <div className="absolute left-0 top-full z-40 mt-1 w-80 rounded-lg border border-vestara-glass-border bg-vestara-surface shadow-xl max-h-80 overflow-auto">
          <div className="border-b border-vestara-glass-border px-3 py-2">
            <p className="text-xs font-semibold text-vestara-text">Pinned Messages</p>
          </div>
          {pinned.map((msg) => (
            <div
              key={msg.id}
              className="group flex cursor-pointer items-start gap-2 border-b border-vestara-glass-border px-3 py-2 hover:bg-vestara-glass"
            >
              <div className="flex-1 min-w-0" onClick={() => { onJumpTo(msg.id); setShowPanel(false); }}>
                <p className="text-[10px] text-vestara-text-dim mb-0.5">
                  {msg.role === 'user' ? 'You' : 'AI'} · {new Date(msg.created_at).toLocaleTimeString()}
                </p>
                <p className="text-xs text-vestara-text truncate">{msg.content.slice(0, 120)}</p>
              </div>
              <button
                onClick={() => onTogglePin(msg.id)}
                className="shrink-0 text-[10px] text-vestara-text-dim hover:text-red-400 opacity-0 group-hover:opacity-100"
              >
                Unpin
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PinButton({ messageId, isPinned, onToggle }: { messageId: string; isPinned: boolean; onToggle: (id: string) => void }) {
  return (
    <button
      onClick={() => onToggle(messageId)}
      className={`text-[10px] transition-colors ${
        isPinned ? 'text-vestara-gold' : 'text-vestara-text-dim/40 hover:text-vestara-gold'
      }`}
      title={isPinned ? 'Unpin message' : 'Pin message'}
    >
      {isPinned ? '📌' : '📌'}
    </button>
  );
}
