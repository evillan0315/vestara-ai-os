interface TokenUsageBarProps {
  totalTokens: number;
  percentage: number;
  estimatedCost: number;
  limit?: number;
}

export function TokenUsageBar({ totalTokens, percentage, estimatedCost, limit = 128_000 }: TokenUsageBarProps) {
  const color =
    percentage > 90 ? 'bg-red-500' :
    percentage > 70 ? 'bg-yellow-500' :
    'bg-vestara-blue';

  return (
    <div className="group relative">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-vestara-glass">
          <div
            className={`h-full rounded-full transition-all duration-300 ${color}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <span className="text-[9px] text-vestara-text-dim/60 font-mono">
          {totalTokens.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>

      <div className="absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-vestara-glass-border bg-vestara-surface px-3 py-2 text-xs text-vestara-text opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        <p className="text-vestara-text-dim">Context Window</p>
        <p>Tokens: {totalTokens.toLocaleString()} / {limit.toLocaleString()}</p>
        <p className="mt-1 text-vestara-text-dim/60">
          Est. cost: ${estimatedCost.toFixed(5)}
        </p>
      </div>
    </div>
  );
}
