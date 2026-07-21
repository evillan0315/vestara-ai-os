import type { ProjectStats } from '../hooks/useProjects';

interface StatsBarProps {
  stats: ProjectStats | null;
}

export function StatsBar({ stats }: StatsBarProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
      <StatCard label="Total Projects" value={stats.total} />
      <StatCard label="Active" value={stats.byStatus.active || 0} className="text-vestara-success" />
      <StatCard label="Total Tasks" value={stats.totalTasks} />
      <StatCard label="Done" value={stats.tasksByStatus.done || 0} className="text-vestara-success" />
    </div>
  );
}

function StatCard({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="glass rounded-lg p-3 md:p-4">
      <div className="text-xs md:text-sm text-vestara-text-muted">{label}</div>
      <div className={`text-xl md:text-2xl font-bold ${className || 'text-vestara-text'} mt-0.5 md:mt-1`}>
        {value}
      </div>
    </div>
  );
}
