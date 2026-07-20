import { useState } from 'react';

export function Chat() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // TODO: Connect to API streaming
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'AI provider integration coming soon. This is a placeholder response.' },
      ]);
    }, 500);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-vestara-text">AI Chat</h1>
        <p className="text-sm text-vestara-text-muted">Ask anything. Code, research, documentation.</p>
      </div>

      <div className="glass flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-lg text-vestara-text-muted">What can I help you with?</p>
                <p className="mt-1 text-sm text-vestara-text-dim">I can help with code, research, and more.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-vestara-gold/20 text-vestara-text'
                        : 'glass-sm text-vestara-text'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-vestara-glass-border p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 rounded-lg border border-vestara-glass-border bg-vestara-bg px-4 py-2.5 text-sm text-vestara-text placeholder-vestara-text-dim outline-none focus:border-vestara-gold/50"
            />
            <button onClick={handleSend} className="btn-gold px-4 py-2.5 text-sm">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
