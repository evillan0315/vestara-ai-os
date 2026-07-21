import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface AddProviderDialogProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

const PROVIDER_TYPES = [
  { value: 'opencode', label: 'OpenCode' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'custom', label: 'Custom' },
];

export function AddProviderDialog({ open, onClose, onAdded }: AddProviderDialogProps) {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState('opencode');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          apiKey: apiKey.trim() || undefined,
          baseUrl: baseUrl.trim() || undefined,
        }),
      });
      if (res.ok) {
        onAdded();
        handleClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add provider');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setType('opencode');
    setApiKey('');
    setBaseUrl('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 modal-overlay" onClick={handleClose}>
      <div className="modal-content glass rounded-lg p-5 md:p-6 w-full max-w-sm mx-3 border border-vestara-glass-border" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base md:text-lg font-bold text-vestara-text mb-4">Add AI Provider</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-vestara-text-muted mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-vestara-glass-border bg-vestara-bg px-3 py-1.5 text-xs text-vestara-text outline-none"
              placeholder="My Provider"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-vestara-text-muted mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-vestara-glass-border bg-vestara-bg px-3 py-1.5 text-xs text-vestara-text outline-none"
            >
              {PROVIDER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-vestara-text-muted mb-1">API Key <span className="text-vestara-text-dim">(optional)</span></label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full rounded-lg border border-vestara-glass-border bg-vestara-bg px-3 py-1.5 text-xs text-vestara-text outline-none font-mono"
              placeholder="sk-..."
            />
          </div>
          <div>
            <label className="block text-xs text-vestara-text-muted mb-1">Base URL <span className="text-vestara-text-dim">(optional)</span></label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full rounded-lg border border-vestara-glass-border bg-vestara-bg px-3 py-1.5 text-xs text-vestara-text outline-none font-mono"
              placeholder="https://api.example.com/v1"
            />
          </div>

          {error && (
            <p className="text-[10px] text-vestara-error mt-1">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-vestara-bg border border-vestara-glass-border rounded-lg text-xs text-vestara-text hover:bg-vestara-glass"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg text-xs font-medium btn-gold disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Provider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
