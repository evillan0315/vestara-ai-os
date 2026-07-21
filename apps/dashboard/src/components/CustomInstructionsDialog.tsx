import { useState } from 'react';

interface CustomInstructionsDialogProps {
  open: boolean;
  value: string;
  onSave: (value: string) => void;
  onClose: () => void;
}

export function CustomInstructionsDialog({ open, value, onSave, onClose }: CustomInstructionsDialogProps) {
  const [draft, setDraft] = useState(value);

  if (!open) return null;

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex w-full max-w-lg flex-col rounded-lg border border-vestara-glass-border bg-vestara-surface p-6">
        <h2 className="mb-1 text-lg font-bold text-vestara-text">Custom Instructions</h2>
        <p className="mb-4 text-xs text-vestara-text-dim">
          These instructions are prepended to every message in this chat.
        </p>

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g., Always use TypeScript strict mode. Prefer functional components. Write unit tests for all new code."
          className="mb-4 min-h-[160px] w-full resize-y rounded-lg border border-vestara-glass-border bg-vestara-bg p-3 text-sm text-vestara-text placeholder-vestara-text-dim outline-none focus:border-vestara-gold/50"
          autoFocus
        />

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-vestara-text-dim/50">
            {draft.length} characters
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-vestara-glass-border bg-vestara-bg px-4 py-2 text-sm text-vestara-text hover:bg-vestara-glass"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-lg bg-vestara-gold px-4 py-2 text-sm font-medium text-vestara-bg hover:bg-vestara-gold/80"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
