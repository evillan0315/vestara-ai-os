import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SettingRow } from './SettingRow';

interface Provider {
  id: string;
  name: string;
  type: string;
  api_key_encrypted: string | null;
  base_url: string | null;
  enabled: boolean;
  config: Record<string, unknown>;
}

const PROVIDER_LOGOS: Record<string, string> = {
  openai: '🤖',
  anthropic: '🧠',
  google: '🔍',
  ollama: '🦙',
  opencode: '🔓',
};

export function ProviderCard() {
  const { token } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/providers', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setProviders(data.providers || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const toggleProvider = useCallback(async (id: string, enabled: boolean) => {
    try {
      await fetch(`/api/providers/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      setProviders(prev => prev.map(p => p.id === id ? { ...p, enabled } : p));
    } catch {}
  }, [token]);

  if (loading) {
    return (
      <div className="glass p-5">
        <h2 className="text-sm font-semibold text-vestara-gold mb-3">AI Providers</h2>
        <div className="text-xs text-vestara-text-dim">Loading providers...</div>
      </div>
    );
  }

  return (
    <div className="glass p-5">
      <h2 className="text-sm font-semibold text-vestara-gold mb-3">AI Providers</h2>
      <div className="space-y-3">
        {providers.length === 0 ? (
          <p className="text-xs text-vestara-text-dim">No providers configured. Add one to get started.</p>
        ) : (
          providers.map((provider) => (
            <div key={provider.id} className="rounded-lg border border-vestara-glass-border p-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">{PROVIDER_LOGOS[provider.type] || '🤖'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-vestara-text capitalize">{provider.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${provider.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {provider.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <span className="text-[10px] text-vestara-text-dim font-mono">{provider.type}{provider.base_url ? ` · ${provider.base_url}` : ''}</span>
                </div>
                <button
                  onClick={() => toggleProvider(provider.id, !provider.enabled)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${provider.enabled ? 'bg-vestara-success' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${provider.enabled ? 'translate-x-4' : ''}`} />
                </button>
              </div>
              {provider.enabled && provider.type !== 'opencode' && (
                <div className="mt-2 pt-2 border-t border-vestara-glass-border/30 space-y-1">
                  <SettingRow label="Base URL" value={provider.base_url || ''} type="text" monospace />
                  <SettingRow label="API Key" value={provider.api_key_encrypted ? '••••••••' : ''} type="password" />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
