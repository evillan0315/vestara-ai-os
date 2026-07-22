import { useState, useCallback } from 'react';
import { useProviders } from '../../hooks/useProviders';
import { useToast } from '../../contexts/ToastContext';
import { SettingRow } from './SettingRow';
import { AddProviderDialog } from './AddProviderDialog';
import { ConfirmDialog } from '../ConfirmDialog';

const PROVIDER_LOGOS: Record<string, string> = {
  openai: '🤖',
  anthropic: '🧠',
  google: '🔍',
  ollama: '🦙',
  opencode: '🔓',
};

export function ProviderCard() {
  const { addToast } = useToast();
  const { providers, loading, toggleProvider, deleteProvider, addProvider, updateProvider } = useProviders();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleUpdateField = useCallback(async (id: string, field: string, value: string) => {
    setSavingId(id);
    const body: Record<string, string> = {};
    if (field === 'api_key') body.apiKey = value;
    if (field === 'base_url') body.baseUrl = value;
    const ok = await updateProvider(id, body);
    if (ok) addToast(`${field === 'api_key' ? 'API key' : 'Base URL'} updated`);
    setSavingId(null);
  }, [updateProvider, addToast]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    const ok = await deleteProvider(deleteId);
    if (ok) addToast('Provider deleted');
    setDeleteId(null);
  }, [deleteId, deleteProvider, addToast]);

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
                    onChange={(v) => handleUpdateField(provider.id, 'base_url', v)}
                  />
                  <SettingRow
                    label="API Key"
                    value={provider.api_key_encrypted ? '••••••••' : ''}
                    type="password"
                    onChange={(v) => handleUpdateField(provider.id, 'api_key', v)}
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
        onAdded={() => addToast('Provider added')}
      />

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete Provider"
        message="Are you sure you want to delete this provider? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
