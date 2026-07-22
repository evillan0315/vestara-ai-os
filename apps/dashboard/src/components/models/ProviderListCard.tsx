import { useState } from 'react';
import { PROVIDERS } from '@vestara/constants';
import type { Provider, ProviderTestResult } from '../../hooks/useProviders';

interface ProviderListCardProps {
  providers: Provider[];
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => Promise<ProviderTestResult>;
  onAdd: () => void;
}

export function ProviderListCard({ providers, onToggle, onDelete, onTest, onAdd }: ProviderListCardProps) {
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ProviderTestResult>>({});
  const [deleting, setDeleting] = useState<string | null>(null);

  const cloudProviders = Object.entries(PROVIDERS).filter(
    ([key]) => !['opencode', 'ollama'].includes(key)
  );

  const handleTest = async (id: string) => {
    setTesting(id);
    const result = await onTest(id);
    setTestResults((prev) => ({ ...prev, [id]: result }));
    setTesting(null);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    onDelete(id);
    setDeleting(null);
  };

  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-vestara-gold">Cloud Providers</h2>
        <button onClick={onAdd} className="glass-sm px-3 py-1.5 text-xs text-vestara-gold hover:text-vestara-gold-light">
          + Add Provider
        </button>
      </div>

      <div className="space-y-3">
        {/* Configured providers */}
        {providers.map((provider) => {
          const info = PROVIDERS[provider.type];
          const testResult = testResults[provider.id];
          return (
            <div key={provider.id} className="rounded-lg border border-vestara-glass-border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{info?.icon || '🤖'}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-vestara-text">{provider.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        provider.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {provider.enabled ? 'Active' : 'Disabled'}
                      </span>
                      {testResult && (
                        <span className={`text-[10px] ${testResult.status === 'ok' ? 'text-vestara-success' : 'text-vestara-error'}`}>
                          {testResult.status === 'ok' ? `✓ ${testResult.latency}ms` : '✕ Failed'}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-vestara-text-dim font-mono">{provider.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTest(provider.id)}
                    disabled={testing === provider.id}
                    className="text-[10px] text-vestara-text-dim hover:text-vestara-text p-1"
                    title="Test connection"
                  >
                    {testing === provider.id ? '...' : '⟳'}
                  </button>
                  <button
                    onClick={() => handleDelete(provider.id)}
                    disabled={deleting === provider.id}
                    className="text-[10px] text-vestara-text-dim hover:text-vestara-error p-1"
                    title="Delete"
                  >
                    ✕
                  </button>
                  <button
                    onClick={() => onToggle(provider.id, !provider.enabled)}
                    className={`relative h-5 w-9 rounded-full transition-colors ${provider.enabled ? 'bg-vestara-success' : 'bg-white/10'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${provider.enabled ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
              </div>
              {provider.base_url && (
                <p className="mt-1 text-[10px] text-vestara-text-dim font-mono">{provider.base_url}</p>
              )}
            </div>
          );
        })}

        {/* Available providers not yet configured */}
        {cloudProviders
          .filter(([key]) => !providers.find((p) => p.type === key))
          .map(([key, info]) => (
            <div key={key} className="rounded-lg border border-dashed border-vestara-glass-border p-3 opacity-60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{info.icon}</span>
                  <div>
                    <span className="text-sm font-medium text-vestara-text">{info.name}</span>
                    <p className="text-[10px] text-vestara-text-dim">{info.description}</p>
                  </div>
                </div>
                <button onClick={onAdd} className="glass-sm px-3 py-1.5 text-xs text-vestara-gold hover:text-vestara-gold-light">
                  Configure
                </button>
              </div>
            </div>
          ))}

        {providers.length === 0 && cloudProviders.every(([key]) => providers.find((p) => p.type === key)) && (
          <p className="text-xs text-vestara-text-dim text-center py-4">No cloud providers configured yet.</p>
        )}
      </div>
    </div>
  );
}
