import { useState, useEffect, useCallback } from 'react';

interface ChatTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  model?: string;
  agent?: string;
  customInstructions?: string;
}

const STORAGE_KEY = 'vestara_chat_templates';

function loadTemplates(): ChatTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTemplates(templates: ChatTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

interface ChatTemplatesProps {
  open: boolean;
  onSelect: (template: ChatTemplate) => void;
  currentPrompt: string;
  currentModel: string;
  currentAgent: string;
  currentInstructions: string;
  onClose: () => void;
}

export function ChatTemplates({ open, onSelect, currentPrompt, currentModel, currentAgent, currentInstructions, onClose }: ChatTemplatesProps) {
  const [templates, setTemplates] = useState<ChatTemplate[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');

  useEffect(() => { setTemplates(loadTemplates()); }, [open]);

  const handleSave = useCallback(() => {
    if (!saveName.trim()) return;
    const newTemplate: ChatTemplate = {
      id: crypto.randomUUID(),
      name: saveName.trim(),
      description: saveDesc.trim() || 'Chat template',
      prompt: currentPrompt,
      model: currentModel,
      agent: currentAgent,
      customInstructions: currentInstructions,
    };
    const updated = [...templates, newTemplate];
    saveTemplates(updated);
    setTemplates(updated);
    setSaveName('');
    setSaveDesc('');
    setShowSave(false);
  }, [saveName, saveDesc, currentPrompt, currentModel, currentAgent, currentInstructions, templates]);

  const handleDelete = useCallback((id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    saveTemplates(updated);
    setTemplates(updated);
  }, [templates]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex w-full max-w-lg flex-col rounded-lg border border-vestara-glass-border bg-vestara-surface p-6">
        <h2 className="mb-1 text-lg font-bold text-vestara-text">Chat Templates</h2>
        <p className="mb-4 text-xs text-vestara-text-dim">Save and reuse prompt configurations.</p>

        {showSave ? (
          <div className="mb-4 space-y-2">
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Template name"
              className="w-full rounded border border-vestara-glass-border bg-vestara-bg px-3 py-2 text-xs text-vestara-text outline-none focus:border-vestara-gold/50"
              autoFocus
            />
            <input
              value={saveDesc}
              onChange={(e) => setSaveDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full rounded border border-vestara-glass-border bg-vestara-bg px-3 py-2 text-xs text-vestara-text outline-none focus:border-vestara-gold/50"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowSave(false)} className="rounded border border-vestara-glass-border px-3 py-1.5 text-xs text-vestara-text-dim hover:text-vestara-text">Cancel</button>
              <button onClick={handleSave} className="rounded bg-vestara-gold px-3 py-1.5 text-xs text-vestara-bg font-medium">Save</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowSave(true)}
            className="mb-4 rounded border border-dashed border-vestara-gold/30 px-3 py-2 text-xs text-vestara-gold hover:bg-vestara-gold/5"
          >
            + Save current as template
          </button>
        )}

        <div className="max-h-60 overflow-auto space-y-1">
          {templates.length === 0 && (
            <p className="py-4 text-center text-xs text-vestara-text-dim">No templates saved yet</p>
          )}
          {templates.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-lg border border-vestara-glass-border bg-vestara-bg px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-vestara-text truncate">{t.name}</p>
                <p className="text-[10px] text-vestara-text-dim truncate">{t.description}</p>
              </div>
              <button onClick={() => { onSelect(t); onClose(); }} className="rounded px-2 py-1 text-[10px] text-vestara-blue hover:bg-vestara-blue/10">Load</button>
              <button onClick={() => handleDelete(t.id)} className="rounded px-2 py-1 text-[10px] text-vestara-text-dim hover:text-red-400">×</button>
            </div>
          ))}
        </div>

        <button onClick={onClose} className="mt-4 rounded-lg border border-vestara-glass-border bg-vestara-bg px-4 py-2 text-sm text-vestara-text hover:bg-vestara-glass">Close</button>
      </div>
    </div>
  );
}

export type { ChatTemplate };
