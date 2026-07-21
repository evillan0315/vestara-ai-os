interface BulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onStatusChange: (status: string) => void;
  onClear: () => void;
  onSelectAll: () => void;
}

export function BulkActions({ selectedCount, totalCount, onStatusChange, onClear, onSelectAll }: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="glass rounded-lg p-2 md:p-3 border border-vestara-gold/30 flex items-center gap-2 md:gap-3 flex-wrap toast-enter mb-3">
      <span className="text-xs md:text-sm text-vestara-text font-medium">
        {selectedCount} of {totalCount} selected
      </span>
      {selectedCount < totalCount && (
        <button onClick={onSelectAll}
          className="text-[10px] md:text-xs text-vestara-text-dim hover:text-vestara-text-muted underline">
          Select all
        </button>
      )}
      <div className="flex items-center gap-1 md:gap-1.5 ml-1">
        <span className="text-[10px] md:text-xs text-vestara-text-dim hidden sm:inline">Set:</span>
        {(['todo', 'in_progress', 'review', 'done'] as const).map((s) => (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            className="px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs bg-vestara-bg border border-vestara-glass-border text-vestara-text-muted hover:bg-vestara-glass hover:text-vestara-text transition-colors"
          >
            {s === 'todo' ? 'To Do' : s === 'in_progress' ? 'In Prog' : s === 'review' ? 'Review' : '✓ Done'}
          </button>
        ))}
      </div>
      <button onClick={onClear}
        className="ml-auto text-[10px] md:text-xs text-vestara-text-dim hover:text-vestara-text transition-colors">
        ✕ Clear
      </button>
    </div>
  );
}
