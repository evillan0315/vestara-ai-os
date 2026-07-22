import { useState, useMemo, useCallback, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string | null;
  created_at: string;
}

interface MessageSearchProps {
  messages: Message[];
  onJumpTo: (messageId: string) => void;
  onClose: () => void;
}

export function MessageSearch({ messages, onJumpTo, onClose }: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return messages
      .map((msg, index) => ({
        message: msg,
        index,
        snippet: getSnippet(msg.content, q),
      }))
      .filter(({ snippet }) => snippet !== null);
  }, [query, messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        onJumpTo(results[selectedIndex].message.id);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex, onJumpTo, onClose]);

  const handleSelect = useCallback((messageId: string) => {
    onJumpTo(messageId);
    onClose();
  }, [onJumpTo, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/30">
      <div className="w-full max-w-lg rounded-lg border border-vestara-glass-border bg-vestara-surface shadow-2xl">
        <div className="flex items-center gap-2 border-b border-vestara-glass-border px-4 py-3">
          <span className="text-vestara-text-dim">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
            className="flex-1 bg-transparent text-sm text-vestara-text placeholder-vestara-text-dim outline-none"
          />
          <span className="text-[10px] text-vestara-text-dim">
            {results.length > 0 ? `${selectedIndex + 1}/${results.length}` : query ? 'No results' : ''}
          </span>
          <button onClick={onClose} className="text-vestara-text-dim hover:text-vestara-text text-xs">✕</button>
        </div>

        {results.length > 0 && (
          <div className="max-h-64 overflow-auto">
            {results.map(({ message, index, snippet }, i) => (
              <button
                key={message.id}
                onClick={() => handleSelect(message.id)}
                className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selectedIndex ? 'bg-vestara-gold/10' : 'hover:bg-vestara-glass'
                }`}
              >
                <span className={`shrink-0 mt-0.5 text-[10px] px-1.5 py-0.5 rounded ${
                  message.role === 'user' ? 'bg-vestara-gold/20 text-vestara-gold' : 'bg-vestara-blue/20 text-vestara-blue'
                }`}>
                  {message.role === 'user' ? 'You' : 'AI'}
                </span>
                <span className="flex-1 min-w-0 text-xs text-vestara-text line-clamp-2">{snippet}</span>
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-vestara-glass-border px-4 py-2 flex items-center gap-4 text-[10px] text-vestara-text-dim">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
}

function getSnippet(content: string, query: string): string | null {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx === -1) return null;

  const start = Math.max(0, idx - 40);
  const end = Math.min(content.length, idx + query.length + 40);
  let snippet = content.slice(start, end);

  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';

  return snippet;
}
