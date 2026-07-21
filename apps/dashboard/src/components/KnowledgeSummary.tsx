interface KnowledgeSummaryProps {
  stats: { total?: number; byType?: Record<string, number> } | null;
}

export function KnowledgeSummary({ stats }: KnowledgeSummaryProps) {
  if (!stats) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-vestara-gold">Knowledge Base</h2>
        <a href="/knowledge" className="text-[10px] text-vestara-text-dim hover:text-vestara-gold transition-colors">View all</a>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="glass-sm rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-vestara-text tabular-nums">{stats.total || 0}</p>
          <p className="text-[10px] text-vestara-text-muted">Entries</p>
        </div>
        <div className="glass-sm rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-vestara-cyan tabular-nums">{stats.byType?.document || 0}</p>
          <p className="text-[10px] text-vestara-text-muted">Documents</p>
        </div>
      </div>
    </div>
  );
}
