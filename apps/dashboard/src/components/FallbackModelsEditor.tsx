import { useState } from 'react';
import { OPENCODE_MODELS } from '@vestara/constants';

interface FallbackModelsEditorProps {
  open: boolean;
  models: string[];
  primaryModel: string;
  onSave: (models: string[]) => void;
  onClose: () => void;
}

export function FallbackModelsEditor({ open, models, primaryModel, onSave, onClose }: FallbackModelsEditorProps) {
  const [draft, setDraft] = useState<string[]>(models);

  if (!open) return null;

  const available = OPENCODE_MODELS.filter((m) => m.id !== primaryModel);

  const toggleModel = (modelId: string) => {
    setDraft((prev) =>
      prev.includes(modelId) ? prev.filter((m) => m !== modelId) : [...prev, modelId],
    );
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setDraft((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    if (index >= draft.length - 1) return;
    setDraft((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex w-full max-w-md flex-col rounded-lg border border-vestara-glass-border bg-vestara-surface p-6">
        <h2 className="mb-1 text-lg font-bold text-vestara-text">Fallback Models</h2>
        <p className="mb-4 text-xs text-vestara-text-dim">
          If the primary model fails, OpenCode will try fallbacks in order.
        </p>

        <div className="mb-3">
          <p className="text-xs text-vestara-text-muted mb-1">Primary:</p>
          <div className="rounded-lg border border-vestara-gold/30 bg-vestara-gold/5 px-3 py-2 text-xs text-vestara-gold font-mono">
            {OPENCODE_MODELS.find((m) => m.id === primaryModel)?.name || primaryModel}
          </div>
        </div>

        <p className="mb-2 text-xs text-vestara-text-muted">Fallbacks (in order):</p>

        <div className="mb-4 space-y-1">
          {draft.length === 0 && (
            <p className="py-4 text-center text-xs text-vestara-text-dim">
              No fallback models configured. Select models below.
            </p>
          )}
          {draft.map((modelId, i) => {
            const model = OPENCODE_MODELS.find((m) => m.id === modelId);
            return (
              <div
                key={modelId}
                className="flex items-center gap-2 rounded-lg border border-vestara-glass-border bg-vestara-bg px-3 py-2"
              >
                <span className="text-[10px] text-vestara-text-dim/40 font-mono w-4">{i + 1}.</span>
                <span className="flex-1 text-xs text-vestara-text font-mono truncate">
                  {model?.name || modelId}
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    className="rounded px-1 py-0.5 text-[10px] text-vestara-text-dim hover:text-vestara-text disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveDown(i)}
                    disabled={i >= draft.length - 1}
                    className="rounded px-1 py-0.5 text-[10px] text-vestara-text-dim hover:text-vestara-text disabled:opacity-30"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => toggleModel(modelId)}
                    className="ml-1 rounded px-1 py-0.5 text-[10px] text-vestara-text-dim hover:text-red-400"
                  >
                    &times;
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mb-2 text-xs text-vestara-text-muted">Add fallback:</p>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {available
            .filter((m) => !draft.includes(m.id))
            .map((m) => (
              <button
                key={m.id}
                onClick={() => toggleModel(m.id)}
                className="rounded border border-vestara-glass-border bg-vestara-bg px-2 py-1 text-[10px] text-vestara-text-muted hover:text-vestara-text hover:border-vestara-gold/30 transition-colors"
              >
                + {m.name}
              </button>
            ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-vestara-glass-border bg-vestara-bg px-4 py-2 text-sm text-vestara-text hover:bg-vestara-glass"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-lg bg-vestara-gold px-4 py-2 text-sm font-medium text-vestara-bg hover:bg-vestara-gold/80"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
