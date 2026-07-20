import { useEffect, useState } from 'react';

interface HealthStatus {
  status: string;
  uptime: number;
  version: string;
}

interface Stats {
  cpu: { usage: number; cores: number; model: string };
  memory: { total: number; used: number; free: number };
  disk: { total: number; used: number; free: number };
}

export function Dashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [healthRes, statsRes] = await Promise.all([
          fetch('/api/system/health'),
          fetch('/api/system/stats'),
        ]);
        if (healthRes.ok) setHealth(await healthRes.json());
        if (statsRes.ok) setStats(await statsRes.json());
      } catch {
        // API not available yet
      }
    };
    fetchData();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const cards = [
    { label: 'AI Status', value: health?.status === 'ok' ? 'Ready' : 'Loading...', color: 'text-vestara-success' },
    { label: 'CPU', value: stats ? `${stats.cpu.usage}%` : '--', color: 'text-vestara-text' },
    { label: 'RAM', value: stats ? formatBytes(stats.memory.used) : '--', color: 'text-vestara-text' },
    { label: 'Disk', value: stats ? formatBytes(stats.disk.used) : '--', color: 'text-vestara-text' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-vestara-text">Welcome Back</h1>
        <p className="text-sm text-vestara-text-muted">Vestara AI OS — Version {health?.version ?? '0.1.0'}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="glass p-4">
            <p className="text-xs text-vestara-text-muted">{card.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass p-5">
          <h2 className="mb-3 text-sm font-semibold text-vestara-gold">Quick Actions</h2>
          <div className="flex flex-wrap gap-2">
            <a href="/chat" className="btn-gold text-sm">New Chat</a>
            <a href="/agents" className="glass-sm px-4 py-2 text-sm text-vestara-text-muted hover:text-vestara-text">Agents</a>
            <a href="/models" className="glass-sm px-4 py-2 text-sm text-vestara-text-muted hover:text-vestara-text">Models</a>
            <a href="/settings" className="glass-sm px-4 py-2 text-sm text-vestara-text-muted hover:text-vestara-text">Settings</a>
          </div>
        </div>

        <div className="glass p-5">
          <h2 className="mb-3 text-sm font-semibold text-vestara-gold">System</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-vestara-text-muted">Platform</span>
              <span>{stats?.cpu.model || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-vestara-text-muted">Cores</span>
              <span>{stats?.cpu.cores || '--'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-vestara-text-muted">Total RAM</span>
              <span>{stats ? formatBytes(stats.memory.total) : '--'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-vestara-text-muted">Uptime</span>
              <span>{health ? `${Math.floor(health.uptime / 60)}m` : '--'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
