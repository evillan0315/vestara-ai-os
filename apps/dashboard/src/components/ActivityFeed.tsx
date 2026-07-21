import { formatDistanceToNow } from '../utils/time';

interface ActivityItem {
  id: string;
  action: string;
  resource: string;
  userName?: string;
  createdAt: string;
}

interface ActivityFeedProps {
  activity: ActivityItem[];
}

const actionLabels: Record<string, string> = {
  'project:created': 'created project',
  'project:updated': 'updated project',
  'project:deleted': 'deleted project',
  'project:synced': 'synced project',
  'project:archived': 'archived project',
  'project:cloned': 'cloned project',
  'project:imported': 'imported project',
  'task:created': 'created task',
  'task:updated': 'updated task',
  'task:deleted': 'deleted task',
};

const actionIcons: Record<string, string> = {
  'project:created': '📁',
  'project:updated': '✏️',
  'project:deleted': '🗑️',
  'project:synced': '🔄',
  'project:archived': '📦',
  'project:cloned': '📋',
  'project:imported': '📥',
  'task:created': '✅',
  'task:updated': '🔄',
  'task:deleted': '🗑️',
};

export function ActivityFeed({ activity }: ActivityFeedProps) {
  if (!activity?.length) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-vestara-gold">Recent Activity</h2>
      </div>
      <div className="space-y-1.5">
        {activity.map((item) => (
          <div key={item.id} className="flex items-start gap-2.5 text-xs">
            <span className="text-base leading-5">{actionIcons[item.action] || '📌'}</span>
            <div className="min-w-0 flex-1">
              <p className="text-vestara-text truncate">
                {actionLabels[item.action] || item.action.replace(/:/g, ' ')}
              </p>
              <p className="text-[10px] text-vestara-text-dim">
                {formatDistanceToNow(new Date(item.createdAt))}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
