import { useEffect, useCallback } from 'react';

interface BrowserEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  icon: string;
}

interface DirectoryBrowserProps {
  show: boolean;
  path: string;
  entries: BrowserEntry[];
  onLoadDir: (path: string) => void;
  onSelect: (path: string) => void;
  onClose: () => void;
}

export function DirectoryBrowser({ show, path, entries, onLoadDir, onSelect, onClose }: DirectoryBrowserProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex w-full max-w-2xl max-h-[80vh] flex-col rounded-lg border border-vestara-glass-border bg-vestara-surface p-6">
        <h2 className="mb-4 text-xl font-bold text-vestara-text">Select Working Directory</h2>
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-vestara-text-muted">Current:</span>
          <span className="font-mono text-vestara-text">{path || '~'}</span>
        </div>
        <div className="min-h-[300px] flex-1 overflow-y-auto rounded-lg border border-vestara-glass-border bg-vestara-bg">
          {path && (
            <button
              onClick={() => {
                const parent = path.substring(0, path.lastIndexOf('/')) || '';
                onLoadDir(parent);
              }}
              className="flex w-full items-center gap-2 border-b border-vestara-glass-border px-4 py-2 text-left text-sm text-vestara-text-muted hover:bg-vestara-gold/10"
            >
              <span>..</span>
              <span className="text-vestara-text-dim">Parent directory</span>
            </button>
          )}
          {entries.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-vestara-text-dim">
              No subdirectories
            </div>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.path}
                onClick={() => onLoadDir(entry.path)}
                className="flex w-full items-center gap-2 border-b border-vestara-glass-border px-4 py-2 text-left text-sm text-vestara-text hover:bg-vestara-gold/10"
              >
                <span>{entry.icon || '📁'}</span>
                <span className="font-mono">{entry.name}</span>
              </button>
            ))
          )}
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-vestara-glass-border bg-vestara-bg px-4 py-2 text-vestara-text hover:bg-vestara-glass"
          >
            Cancel
          </button>
          <button
            onClick={() => onSelect(path)}
            className="flex-1 rounded-lg bg-vestara-gold px-4 py-2 text-sm font-medium text-vestara-bg hover:bg-vestara-gold/80"
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
}
