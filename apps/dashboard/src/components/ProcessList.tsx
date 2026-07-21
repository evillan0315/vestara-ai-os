interface Process {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
}

interface ProcessListProps {
  processes: Process[];
}

export function ProcessList({ processes }: ProcessListProps) {
  if (!processes?.length) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-vestara-gold mb-3">Top Processes</h2>
      <div className="space-y-0.5">
        {processes.slice(0, 8).map((p) => (
          <div key={p.pid} className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-vestara-glass transition-colors">
            <span className="w-16 text-[10px] text-vestara-text-dim font-mono">{p.pid}</span>
            <span className="flex-1 truncate text-vestara-text">{p.name}</span>
            <span className="w-12 text-right text-vestara-text-dim font-mono">{p.cpu.toFixed(1)}%</span>
            <span className="w-12 text-right text-vestara-text-dim font-mono">{p.mem.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
