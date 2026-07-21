import { useState, useMemo, useCallback } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { formatBytes } from '../utils/format';
import { Greeting } from '../components/Greeting';
import { MetricCard } from '../components/MetricCard';
import { PerformanceBanner } from '../components/PerformanceBanner';
import { CpuChart } from '../components/CpuChart';
import { MemChart } from '../components/MemChart';
import { DiskChart } from '../components/DiskChart';
import { SystemGauges } from '../components/SystemGauges';
import { QuickLinks } from '../components/QuickLinks';
import { ProjectSummary } from '../components/ProjectSummary';
import { RecentConversations } from '../components/RecentConversations';
import { MemorySnapshot } from '../components/MemorySnapshot';
import { KnowledgeSummary } from '../components/KnowledgeSummary';
import { AgentSummary } from '../components/AgentSummary';
import { ActivityFeed } from '../components/ActivityFeed';
import { NotificationBell } from '../components/NotificationBell';
import { ProcessList } from '../components/ProcessList';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import { SystemStatus } from '../components/SystemStatus';

export function Dashboard() {
  const {
    systemStats, health, cpuHistory, memHistory,
    projectStats, conversations, importantMemories, memoryStats,
    knowledgeStats, agents, activity, notifications, unreadNotifications,
    processes, loading, revalidate,
  } = useDashboard();

  const [expandedChart, setExpandedChart] = useState<'cpu' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkError = useCallback(async () => {
    try {
      const res = await fetch('/api/system/health');
      if (!res.ok) setError('System health check failed');
      else setError(null);
    } catch {
      setError('Unable to connect to server');
    }
  }, []);

  const memPercent = systemStats ? Math.round((systemStats.memory.used / systemStats.memory.total) * 100) : 0;
  const diskPercent = systemStats ? Math.round((systemStats.disk.used / systemStats.disk.total) * 100) : 0;

  const sparklineData = useMemo(() => ({
    cpu: cpuHistory.slice(-20).map((p) => p.value),
    mem: memHistory.slice(-20).map((p) => p.value),
  }), [cpuHistory, memHistory]);

  if (loading && !systemStats) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <Greeting />
        <div className="flex items-center gap-2 pt-1">
          {error && (
            <button
              onClick={checkError}
              className="text-[10px] text-vestara-error hover:text-red-300 transition-colors"
            >
              Retry
            </button>
          )}
          <SystemStatus services={health?.services} status={health?.status} />
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadNotifications}
            onMarkRead={async (id) => {
              const token = localStorage.getItem('vestara_token');
              await fetch(`/api/notifications/${id}/read`, {
                method: 'PATCH',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              revalidate();
            }}
            onMarkAllRead={async () => {
              const token = localStorage.getItem('vestara_token');
              await fetch('/api/notifications/read-all', {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              revalidate();
            }}
          />
        </div>
      </div>

      {/* Performance Alerts */}
      <PerformanceBanner stats={systemStats} />

      {/* Top metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="CPU"
          value={systemStats ? `${systemStats.cpu.usage}%` : '--'}
          sub={systemStats?.cpu.model?.split(' ').slice(0, 3).join(' ') || ''}
          color="from-amber-500/20 to-amber-600/5"
          sparkline={sparklineData.cpu}
          alert={systemStats ? systemStats.cpu.usage > 90 : false}
        />
        <MetricCard
          label="Memory"
          value={systemStats ? formatBytes(systemStats.memory.used) : '--'}
          sub={`${memPercent}% of ${systemStats ? formatBytes(systemStats.memory.total) : '--'}`}
          color="from-green-500/20 to-green-600/5"
          sparkline={sparklineData.mem}
          alert={memPercent > 90}
        />
        <MetricCard
          label="Disk"
          value={systemStats ? formatBytes(systemStats.disk.used) : '--'}
          sub={`${diskPercent}% of ${systemStats ? formatBytes(systemStats.disk.total) : '--'}`}
          color="from-blue-500/20 to-blue-600/5"
          alert={diskPercent > 90}
        />
        <MetricCard
          label="Uptime"
          value={health ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` : '--'}
          sub={`${systemStats?.cpu.cores ?? '--'} cores`}
          color="from-purple-500/20 to-purple-600/5"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <CpuChart data={cpuHistory} expanded={expandedChart === 'cpu'} />
        <SystemGauges cpu={systemStats?.cpu.usage || 0} memPercent={memPercent} diskPercent={diskPercent} />
      </div>

      {/* Bottom widgets grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Left column — charts */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MemChart data={memHistory} />
            <DiskChart
              used={systemStats?.disk.used || 0}
              free={systemStats?.disk.free || 0}
            />
          </div>
          {(projectStats || conversations.length > 0) && (
            <div className="glass p-4">
              <ProjectSummary stats={projectStats} />
              {conversations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-vestara-glass-border">
                  <RecentConversations conversations={conversations} />
                </div>
              )}
            </div>
          )}
          <ProcessList processes={processes} />
        </div>

        {/* Right column — widgets */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {memoryStats && (
              <div className="glass p-4">
                <MemorySnapshot memories={importantMemories} stats={memoryStats} />
              </div>
            )}
            {knowledgeStats && (
              <div className="glass p-4">
                <KnowledgeSummary stats={knowledgeStats} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {agents.length > 0 && (
              <div className="glass p-4">
                <AgentSummary agents={agents} />
              </div>
            )}
            <div className="glass p-4">
              <QuickLinks />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {activity.length > 0 && (
              <div className="glass p-4">
                <ActivityFeed activity={activity} />
              </div>
            )}
            {notifications.length > 0 && (
              <div className="glass p-4">
                <h2 className="text-sm font-semibold text-vestara-gold mb-3">Notifications</h2>
                <div className="space-y-1">
                  {notifications.slice(0, 5).map((n: any) => (
                    <div key={n.id} className="text-xs text-vestara-text truncate flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${n.priority === 'urgent' || n.priority === 'high' ? 'bg-vestara-error' : 'bg-vestara-text-dim'}`} />
                      {n.title}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
