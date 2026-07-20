import { useState } from 'react';

export function OpenCodePage() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('anthropic/claude-sonnet-4-5-20250929');

  const handleSend = async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setResponse('');

    try {
      const res = await fetch('/api/providers/opencode/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model }),
      });

      const data = await res.json();
      if (res.ok) {
        setResponse(data.response);
      } else {
        setResponse(`Error: ${data.error}`);
      }
    } catch (err) {
      setResponse(`Error: ${err instanceof Error ? err.message : 'Request failed'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-vestara-text">OpenCode</h1>
        <p className="text-sm text-vestara-text-muted">
          AI coding agent — 75+ models, tool use, code generation
        </p>
      </div>

      <div className="glass flex flex-1 flex-col overflow-hidden">
        {/* Model selector */}
        <div className="flex items-center gap-3 border-b border-vestara-glass-border px-4 py-3">
          <span className="text-xs text-vestara-text-muted">Model:</span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded border border-vestara-glass-border bg-vestara-bg px-2 py-1 text-xs text-vestara-text outline-none"
          >
            <option value="anthropic/claude-opus-4-5-20251101">Claude Opus 4.5</option>
            <option value="anthropic/claude-sonnet-4-5-20250929">Claude Sonnet 4.5</option>
            <option value="openai/gpt-4o">GPT-4o</option>
            <option value="openai/gpt-5.1-codex">GPT-5.1 Codex</option>
            <option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option>
          </select>
        </div>

        {/* Response area */}
        <div className="flex-1 overflow-auto p-4">
          {!response && !loading ? (
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
                      onClick={() => setPrompt(suggestion)}
                      className="glass-sm px-3 py-1.5 text-xs text-vestara-text-muted hover:text-vestara-text"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {loading && (
                <div className="flex items-center gap-2 text-sm text-vestara-blue">
                  <span className="ai-active">●</span>
                  <span>Thinking...</span>
                </div>
              )}
              {response && (
                <div className="glass-sm whitespace-pre-wrap p-4 text-sm text-vestara-text">
                  {response}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-vestara-glass-border p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask OpenCode to write, refactor, or explain code..."
              className="flex-1 rounded-lg border border-vestara-glass-border bg-vestara-bg px-4 py-2.5 text-sm text-vestara-text placeholder-vestara-text-dim outline-none focus:border-vestara-gold/50"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !prompt.trim()}
              className="btn-gold px-4 py-2.5 text-sm disabled:opacity-50"
            >
              {loading ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
