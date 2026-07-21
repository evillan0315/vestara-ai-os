import type { SystemStats } from '../hooks/useDashboard';

interface PerformanceBannerProps {
  stats: SystemStats | null;
}

export function PerformanceBanner({ stats }: PerformanceBannerProps) {
  if (!stats) return null;

  const alerts: Array<{ label: string; message: string; severity: 'warning' | 'error' }> = [];

  if (stats.cpu.usage > 90) {
    alerts.push({ label: 'CPU', message: `CPU at ${stats.cpu.usage}%`, severity: 'error' });
  } else if (stats.cpu.usage > 75) {
    alerts.push({ label: 'CPU', message: `CPU at ${stats.cpu.usage}%`, severity: 'warning' });
  }

  const memPercent = Math.round((stats.memory.used / stats.memory.total) * 100);
  if (memPercent > 90) {
    alerts.push({ label: 'Memory', message: `Memory at ${memPercent}%`, severity: 'error' });
  } else if (memPercent > 75) {
    alerts.push({ label: 'Memory', message: `Memory at ${memPercent}%`, severity: 'warning' });
  }

  const diskPercent = Math.round((stats.disk.used / stats.disk.total) * 100);
  if (diskPercent > 90) {
    alerts.push({ label: 'Disk', message: `Disk at ${diskPercent}%`, severity: 'error' });
  } else if (diskPercent > 75) {
    alerts.push({ label: 'Disk', message: `Disk at ${diskPercent}%`, severity: 'warning' });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-1">
      {alerts.map((a) => (
        <div
          key={a.label}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
            a.severity === 'error'
              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${a.severity === 'error' ? 'bg-red-400 animate-pulse' : 'bg-amber-400'}`} />
          <span>{a.label}:</span>
          <span className="font-medium">{a.message}</span>
        </div>
      ))}
    </div>
  );
}
