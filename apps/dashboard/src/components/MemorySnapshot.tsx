interface MemoryItem {
  id: string | number;
  content: string;
  type?: string;
  importance?: number;
  created_at?: string;
}

interface MemorySnapshotProps {
  memories: MemoryItem[];
  stats: { total?: number; shortTerm?: number; longTerm?: number } | null;
}

export function MemorySnapshot({ memories, stats }: MemorySnapshotProps) {
  if (!memories?.length && !stats) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-vestara-gold">AI Memory</h2>
        <a href="/memory" className="text-[10px] text-vestara-text-dim hover:text-vestara-gold transition-colors">View all</a>
      </div>
      {stats && (
        <div className="flex gap-2 mb-2">
          <span className="text-[10px] text-vestara-text-dim bg-vestara-glass rounded px-1.5 py-0.5">
            {stats.total || 0} total
          </span>
          {stats.shortTerm ? (
            <span className="text-[10px] text-vestara-text-dim bg-vestara-glass rounded px-1.5 py-0.5">
              {stats.shortTerm} recent
            </span>
          ) : null}
        </div>
      )}
      <div className="space-y-1">
        {memories.slice(0, 3).map((mem) => (
          <div key={mem.id} className="glass-sm rounded-lg px-2.5 py-2">
            <p className="text-xs text-vestara-text line-clamp-2">{mem.content}</p>
            {mem.importance !== undefined && (
              <div className="flex gap-0.5 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 w-3 rounded-full ${i < Math.round(mem.importance! * 5) ? 'bg-vestara-gold' : 'bg-vestara-glass'}`}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
