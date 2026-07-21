import type { ActivityEntry } from '../hooks/useProjects';

interface ActivityTimelineProps {
  activity: ActivityEntry[];
  loading?: boolean;
}

const actionConfig: Record<string, { label: string; color: string }> = {
  'project:created': { label: 'Project created', color: 'bg-vestara-success' },
  'project:updated': { label: 'Project updated', color: 'bg-vestara-blue' },
  'project:deleted': { label: 'Project deleted', color: 'bg-vestara-error' },
  'project:cloned': { label: 'Project cloned', color: 'bg-vestara-purple' },
  'project:archived': { label: 'Project archived', color: 'bg-vestara-warning' },
  'project:synced': { label: 'Synced to .vestara', color: 'bg-vestara-cyan' },
  'project:imported': { label: 'Imported from .vestara', color: 'bg-vestara-cyan' },
  'task:created': { label: 'Task created', color: 'bg-vestara-blue' },
};

const actionIcons: Record<string, string> = {
  'project:created': '+',
  'project:updated': '✎',
  'project:deleted': '✕',
  'project:cloned': '◈',
  'project:archived': '▣',
  'project:synced': '⇅',
  'project:imported': '⇄',
  'task:created': '☐',
};

export function ActivityTimeline({ activity, loading }: ActivityTimelineProps) {
  if (loading) {
    return (
      <div className="glass rounded-lg p-4 md:p-6 border border-vestara-glass-border">
        <h3 className="text-sm font-semibold text-vestara-text-muted uppercase tracking-wider mb-4">Activity</h3>
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-vestara-text-dim/30 shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-2/3 rounded bg-vestara-glass" />
                <div className="h-2 w-1/3 rounded bg-vestara-glass/50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <div className="glass rounded-lg p-4 md:p-6 border border-vestara-glass-border">
        <h3 className="text-sm font-semibold text-vestara-text-muted uppercase tracking-wider mb-4">Activity</h3>
        <p className="text-xs md:text-sm text-vestara-text-dim text-center py-8">
          <span className="text-lg block mb-2">📊</span>
          No activity recorded yet
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-lg p-4 md:p-6 border border-vestara-glass-border">
      <h3 className="text-sm font-semibold text-vestara-text-muted uppercase tracking-wider mb-4">Activity</h3>
      <div className="relative">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-vestara-glass-border" />
        <div className="space-y-0">
          {activity.map((entry, i) => {
            const config = actionConfig[entry.action] || { label: entry.action, color: 'bg-vestara-text-dim' };
            return (
              <div key={entry.id} className="relative flex gap-4 pb-4 last:pb-0">
                <div className={`relative z-10 w-3.5 h-3.5 rounded-full mt-0.5 shrink-0 ${config.color} ring-2 ring-vestara-bg flex items-center justify-center`}>
                  <span className="text-[6px] text-white font-bold leading-none">{actionIcons[entry.action] || '•'}</span>
                </div>
                <div className="min-w-0 pt-px">
                  <p className="text-xs md:text-sm text-vestara-text font-medium">{config.label}</p>
                  <p className="text-[10px] md:text-xs text-vestara-text-dim mt-0.5">
                    {new Date(entry.created_at).toLocaleString(undefined, {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <p className="text-[10px] text-vestara-text-dim mt-0.5 font-mono truncate max-w-[300px]">
                      {JSON.stringify(entry.metadata).slice(0, 80)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
