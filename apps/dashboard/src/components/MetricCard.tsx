import { memo } from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  color: string;
  sparkline?: number[];
  alert?: boolean;
}

export const MetricCard = memo(function MetricCard({ label, value, sub, color, sparkline, alert }: MetricCardProps) {
  return (
    <div className={`glass bg-gradient-to-br ${color} p-4 relative overflow-hidden ${alert ? 'ring-1 ring-vestara-error/50' : ''}`}>
      <p className="text-xs text-vestara-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-vestara-text tabular-nums transition-all duration-500">{value}</p>
      <p className={`mt-0.5 text-[10px] truncate ${alert ? 'text-vestara-error' : 'text-vestara-text-dim'}`}>{sub}</p>
      {sparkline && sparkline.length > 1 && (
        <div className="absolute bottom-2 right-3 flex items-end gap-[1px] opacity-30">
          {sparkline.map((v, i) => (
            <div
              key={i}
              className="w-1 bg-current rounded-t"
              style={{
                height: `${Math.max(v * 0.5, 2)}px`,
                backgroundColor: alert ? 'var(--color-vestara-error)' : 'var(--color-vestara-text-muted)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}, (prev, next) =>
  prev.value === next.value &&
  prev.sub === next.sub &&
  prev.alert === next.alert &&
  prev.label === next.label &&
  prev.color === next.color
);
