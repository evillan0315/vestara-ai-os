import { useEffect, useState } from 'react';

interface Provider {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
}

const providerInfo: Record<string, { name: string; icon: string; models: string[] }> = {
  openai: { name: 'OpenAI', icon: '🟢', models: ['GPT-4o', 'GPT-4.1', 'o3-mini'] },
  anthropic: { name: 'Anthropic', icon: '🟤', models: ['Claude Opus', 'Claude Sonnet', 'Claude Haiku'] },
  google: { name: 'Google Gemini', icon: '🔵', models: ['Gemini 2.5 Pro', 'Gemini 2.5 Flash'] },
  openrouter: { name: 'OpenRouter', icon: '🟣', models: ['Various'] },
  ollama: { name: 'Ollama', icon: '🦙', models: ['Local models'] },
  lmstudio: { name: 'LM Studio', icon: '🖥️', models: ['Local models'] },
};

export function Models() {
  const [providers, setProviders] = useState<Provider[]>([]);

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
    fetchProviders();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-vestara-text">Model Manager</h1>
        <p className="text-sm text-vestara-text-muted">Configure AI providers and models.</p>
      </div>

      <div className="space-y-3">
        {Object.entries(providerInfo).map(([key, info]) => {
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
