import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SettingRow } from './SettingRow';
import { AddProviderDialog } from './AddProviderDialog';
import { ConfirmDialog } from '../ConfirmDialog';

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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/providers', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  const toggleProvider = useCallback(async (id: string, enabled: boolean) => {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, enabled } : p));
    try {
      await fetch(`/api/providers/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ enabled }),
      });
    } catch {}
  }, [headers]);

  const updateProviderField = useCallback(async (id: string, field: string, value: string) => {
    setSavingId(id);
    try {
      const body: Record<string, string> = {};
      if (field === 'api_key') body.apiKey = value;
      if (field === 'base_url') body.baseUrl = value;
      const res = await fetch(`/api/providers/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setProviders(prev => prev.map(p => {
          if (p.id !== id) return p;
          if (field === 'api_key') return { ...p, api_key_encrypted: value ? 'encrypted' : null };
          if (field === 'base_url') return { ...p, base_url: value || null };
          return p;
        }));
      }
    } catch {} finally {
      setSavingId(null);
    }
  }, [headers]);

  const deleteProvider = useCallback(async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/providers/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setProviders(prev => prev.filter(p => p.id !== deleteId));
    } catch {} finally {
      setDeleteId(null);
    }
  }, [deleteId, token]);

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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-vestara-gold">AI Providers</h2>
        <button
          onClick={() => setShowAddDialog(true)}
          className="rounded-lg border border-vestara-glass-border px-2.5 py-1 text-[10px] text-vestara-text-muted hover:text-vestara-text hover:bg-white/5 transition-colors"
        >
          + Add
        </button>
      </div>
      <div className="space-y-3">
        {providers.length === 0 ? (
          <p className="text-xs text-vestara-text-dim">No providers configured yet.</p>
        ) : (
          providers.map((provider) => (
            <div key={provider.id} className="rounded-lg border border-vestara-glass-border p-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">{PROVIDER_LOGOS[provider.type] || '🤖'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-vestara-text capitalize">{provider.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      provider.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {provider.enabled ? 'Active' : 'Disabled'}
                    </span>
                    {savingId === provider.id && (
                      <span className="text-[10px] text-vestara-text-dim animate-pulse">saving...</span>
                    )}
                  </div>
                  <span className="text-[10px] text-vestara-text-dim font-mono">
                    {provider.type}
                    {provider.base_url ? ` · ${provider.base_url}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setDeleteId(provider.id)}
                    className="text-[11px] text-vestara-text-dim hover:text-vestara-error transition-colors p-1"
                    title="Delete provider"
                  >
                    ✕
                  </button>
                  <button
                    onClick={() => toggleProvider(provider.id, !provider.enabled)}
                    className={`relative h-5 w-9 rounded-full transition-colors ${provider.enabled ? 'bg-vestara-success' : 'bg-white/10'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${provider.enabled ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
              </div>
              {provider.type !== 'opencode' && (
                <div className="mt-2 pt-2 border-t border-vestara-glass-border/30 space-y-1">
                  <SettingRow
                    label="Base URL"
                    value={provider.base_url || ''}
                    type="text"
                    monospace
                    onChange={(v) => updateProviderField(provider.id, 'base_url', v)}
                  />
                  <SettingRow
                    label="API Key"
                    value={provider.api_key_encrypted ? '••••••••' : ''}
                    type="password"
                    onChange={(v) => updateProviderField(provider.id, 'api_key', v)}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <AddProviderDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdded={fetchProviders}
      />

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete Provider"
        message="Are you sure you want to delete this provider? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={deleteProvider}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
