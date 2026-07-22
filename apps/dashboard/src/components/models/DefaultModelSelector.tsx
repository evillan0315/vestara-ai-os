import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { OPENCODE_MODELS, PROVIDERS } from '@vestara/constants';

interface DefaultModelSelectorProps {
  connectedProviders: string[];
}

export function DefaultModelSelector({ connectedProviders }: DefaultModelSelectorProps) {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [defaultModel, setDefaultModel] = useState<string>('opencode/deepseek-v4-flash-free');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.settings?.defaultModel) setDefaultModel(data.settings.defaultModel);
      })
      .catch(() => {});
  }, [token]);

  const handleSave = useCallback(async (model: string) => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'defaultModel', value: model }),
      });
      setDefaultModel(model);
      addToast('Default model updated');
    } catch {
      addToast('Failed to update default model', 'error');
    } finally {
      setSaving(false);
    }
  }, [token, addToast]);

  // Build model options from all configured providers
  const models: { id: string; name: string; group: string }[] = [];

  // OpenCode models (always available)
  OPENCODE_MODELS.forEach((m) => {
    models.push({ id: m.id, name: m.name, group: 'OpenCode (Free)' });
  });

  // Cloud provider models
  Object.entries(PROVIDERS).forEach(([key, info]) => {
    if (key === 'opencode' || key === 'ollama' || key === 'lmstudio') return;
    if (!connectedProviders.includes(key)) return;
    info.models.forEach((m) => {
      models.push({ id: `${key}/${m.id}`, name: m.name, group: info.name });
    });
  });

  // Group by provider
  const groups = models.reduce<Record<string, typeof models>>((acc, m) => {
    (acc[m.group] ||= []).push(m);
    return acc;
  }, {});

  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-vestara-gold">Default Model</h2>
          <p className="text-[10px] text-vestara-text-muted">Used for chat, agents, and completions</p>
        </div>
        {saving && <span className="text-[10px] text-vestara-text-dim animate-pulse">Saving...</span>}
      </div>

      <select
        value={defaultModel}
        onChange={(e) => handleSave(e.target.value)}
        className="w-full rounded-lg border border-vestara-glass-border bg-vestara-bg px-3 py-2 text-sm text-vestara-text outline-none focus:border-vestara-gold/50"
      >
        {Object.entries(groups).map(([group, items]) => (
          <optgroup key={group} label={group}>
            {items.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </optgroup>
        ))}
      </select>

      <p className="mt-2 text-[10px] text-vestara-text-dim">
        Current: <span className="text-vestara-text font-mono">{defaultModel}</span>
      </p>
    </div>
  );
}
