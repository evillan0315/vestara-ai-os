import { useEffect, useState } from 'react';

interface Provider {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
}

interface OpenCodeStatus {
  installed: boolean;
  version: string | null;
  serverRunning: boolean;
}

const providerInfo: Record<string, { name: string; icon: string; models: string[]; description?: string }> = {
  opencode: {
    name: 'OpenCode',
    icon: '⚡',
    models: [
      'DeepSeek V4 Flash (Free)',
      'Mimo V2.5 (Free)',
      'Nemotron 3 Ultra (Free)',
      'North Mini Code (Free)',
      'Big Pickle',
    ],
    description: 'Open-source AI coding agent — 75+ models via AI SDK',
  },
  openai: { name: 'OpenAI', icon: '🟢', models: ['GPT-4o', 'GPT-4.1', 'o3-mini'] },
  anthropic: { name: 'Anthropic', icon: '🟤', models: ['Claude Opus', 'Claude Sonnet', 'Claude Haiku'] },
  google: { name: 'Google Gemini', icon: '🔵', models: ['Gemini 2.5 Pro', 'Gemini 2.5 Flash'] },
  openrouter: { name: 'OpenRouter', icon: '🟣', models: ['Various'] },
  ollama: { name: 'Ollama', icon: '🦙', models: ['Local models'] },
  lmstudio: { name: 'LM Studio', icon: '🖥️', models: ['Local models'] },
};

export function Models() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [opencodeStatus, setOpencodeStatus] = useState<OpenCodeStatus | null>(null);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await fetch('/api/providers');
        if (res.ok) {
          const data = await res.json();
          setProviders(data.providers);
        }
      } catch {
        // API not available yet
      }
    };

    const fetchOpenCodeStatus = async () => {
      try {
        const res = await fetch('/api/providers/opencode/status');
        if (res.ok) {
          const data = await res.json();
          setOpencodeStatus(data);
        }
      } catch {
        // API not available yet
      }
    };

    fetchProviders();
    fetchOpenCodeStatus();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-vestara-text">Model Manager</h1>
        <p className="text-sm text-vestara-text-muted">Configure AI providers and models.</p>
      </div>

      {/* OpenCode Featured Section */}
      <div className="glass border-vestara-gold/20 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚡</span>
            <div>
              <h2 className="text-lg font-semibold text-vestara-text">OpenCode</h2>
              <p className="text-sm text-vestara-text-muted">
                Open-source AI coding agent — 75+ models via AI SDK
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {opencodeStatus?.installed ? (
              <span className="text-xs text-vestara-success">● Installed{opencodeStatus.version ? ` (${opencodeStatus.version})` : ''}</span>
            ) : (
              <span className="text-xs text-vestara-warning">○ Not installed</span>
            )}
            {opencodeStatus?.serverRunning ? (
              <span className="text-xs text-vestara-success">● Server running</span>
            ) : (
              <span className="text-xs text-vestara-text-dim">○ Server stopped</span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="glass-sm p-3">
            <p className="text-xs text-vestara-text-muted">Models</p>
            <p className="mt-1 text-sm font-medium text-vestara-text">75+ supported</p>
            <p className="text-xs text-vestara-text-dim">Claude, GPT, Gemini, local, and more</p>
          </div>
          <div className="glass-sm p-3">
            <p className="text-xs text-vestara-text-muted">Integration</p>
            <p className="mt-1 text-sm font-medium text-vestara-text">AI SDK</p>
            <p className="text-xs text-vestara-text-dim">Native provider package</p>
          </div>
          <div className="glass-sm p-3">
            <p className="text-xs text-vestara-text-muted">Modes</p>
            <p className="mt-1 text-sm font-medium text-vestara-text">TUI / Server / SDK</p>
            <p className="text-xs text-vestara-text-dim">Terminal, headless, or API</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <a
            href="https://opencode.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-sm px-3 py-1.5 text-xs text-vestara-gold hover:text-vestara-gold-light"
          >
            Documentation
          </a>
          <a
            href="https://github.com/anomalyco/opencode"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-sm px-3 py-1.5 text-xs text-vestara-text-muted hover:text-vestara-text"
          >
            GitHub
          </a>
        </div>
      </div>

      {/* Other Providers */}
      <div className="space-y-3">
        {Object.entries(providerInfo)
          .filter(([key]) => key !== 'opencode')
          .map(([key, info]) => {
            const provider = providers.find((p) => p.type === key);
            return (
              <div key={key} className="glass flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{info.icon}</span>
                  <div>
                    <p className="font-medium text-vestara-text">{info.name}</p>
                    <p className="text-xs text-vestara-text-muted">{info.models.join(', ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs ${provider?.enabled ? 'text-vestara-success' : 'text-vestara-text-dim'}`}>
                    {provider?.enabled ? '● Connected' : '○ Not connected'}
                  </span>
                  <button className="glass-sm px-3 py-1.5 text-xs text-vestara-gold hover:text-vestara-gold-light">
                    {provider ? 'Configure' : 'Connect'}
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
