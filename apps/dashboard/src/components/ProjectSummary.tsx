interface ProjectSummaryProps {
  stats: {
    total?: number;
    byStatus?: Record<string, number>;
    totalTasks?: number;
    tasksByStatus?: Record<string, number>;
  } | null;
}

export function ProjectSummary({ stats }: ProjectSummaryProps) {
  if (!stats) return null;

  const taskDone = stats.tasksByStatus?.done || 0;
  const taskTotal = stats.totalTasks || 0;
  const progress = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-vestara-gold">Projects</h2>
        <a href="/projects" className="text-[10px] text-vestara-text-dim hover:text-vestara-gold transition-colors">View all</a>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="glass-sm rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-vestara-text tabular-nums">{stats.total || 0}</p>
          <p className="text-[10px] text-vestara-text-muted">Total</p>
        </div>
        <div className="glass-sm rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-vestara-blue tabular-nums">{stats.byStatus?.active || 0}</p>
          <p className="text-[10px] text-vestara-text-muted">Active</p>
        </div>
        <div className="glass-sm rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-vestara-success tabular-nums">{taskDone}</p>
          <p className="text-[10px] text-vestara-text-muted">Tasks Done</p>
        </div>
        <div className="glass-sm rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-vestara-purple tabular-nums">{taskTotal}</p>
          <p className="text-[10px] text-vestara-text-muted">Total Tasks</p>
        </div>
      </div>
      {taskTotal > 0 && (
        <div className="h-1.5 rounded-full bg-vestara-glass overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-vestara-gold-dim to-vestara-gold transition-all duration-500 progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
