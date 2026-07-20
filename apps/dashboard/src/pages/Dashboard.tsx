import { useEffect, useState, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend } from 'recharts';

interface HealthStatus {
  status: string;
  uptime: number;
  version: string;
}

interface Stats {
  cpu: { usage: number; cores: number; model: string };
  memory: { total: number; used: number; free: number };
  disk: { total: number; used: number; free: number };
  loadAvg?: number[];
}

const COLORS = ['#d4af37', '#4ade80', '#60a5fa', '#f87171', '#a78bfa'];

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export function Dashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [cpuHistory, setCpuHistory] = useState<Array<{ time: string; value: number }>>([]);
  const [memHistory, setMemHistory] = useState<Array<{ time: string; value: number }>>([]);

  const fetchData = useCallback(async () => {
    try {
      const [healthRes, statsRes] = await Promise.all([
        fetch('/api/system/health'),
        fetch('/api/system/stats'),
      ]);
      if (healthRes.ok) setHealth(await healthRes.json());
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setCpuHistory((prev) => [...prev.slice(-29), { time: now, value: data.cpu.usage }]);
        setMemHistory((prev) => [...prev.slice(-29), { time: now, value: Math.round((data.memory.used / data.memory.total) * 100) }]);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const memPercent = stats ? Math.round((stats.memory.used / stats.memory.total) * 100) : 0;
  const diskPercent = stats ? Math.round((stats.disk.used / stats.disk.total) * 100) : 0;

  const gaugeData = [
    { name: 'CPU', value: stats?.cpu.usage || 0, fill: '#d4af37' },
    { name: 'RAM', value: memPercent, fill: '#4ade80' },
    { name: 'Disk', value: diskPercent, fill: '#60a5fa' },
  ];

  const diskPie = stats ? [
    { name: 'Used', value: stats.disk.used },
    { name: 'Free', value: stats.disk.free },
  ] : [];

  const quickLinks = [
    { href: '/chat', label: 'AI Chat', icon: '💬' },
    { href: '/opencode', label: 'OpenCode', icon: '⚡' },
    { href: '/agents', label: 'Agents', icon: '🤖' },
    { href: '/terminal', label: 'Terminal', icon: '💻' },
    { href: '/monitor', label: 'System', icon: '📈' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-vestara-text">Welcome Back</h1>
          <p className="text-sm text-vestara-text-muted">Vestara AI OS v{health?.version ?? '0.1.0'}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${health?.status === 'ok' ? 'bg-vestara-success animate-pulse' : 'bg-vestara-text-dim'}`} />
          <span className="text-xs text-vestara-text-muted">{health?.status === 'ok' ? 'All Systems Ready' : 'Connecting...'}</span>
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'CPU', value: `${stats?.cpu.usage ?? '--'}%`, sub: stats?.cpu.model?.split(' ').slice(0, 3).join(' ') || '', color: 'from-amber-500/20 to-amber-600/5' },
          { label: 'Memory', value: stats ? formatBytes(stats.memory.used) : '--', sub: `${memPercent}% of ${stats ? formatBytes(stats.memory.total) : '--'}`, color: 'from-green-500/20 to-green-600/5' },
          { label: 'Disk', value: stats ? formatBytes(stats.disk.used) : '--', sub: `${diskPercent}% of ${stats ? formatBytes(stats.disk.total) : '--'}`, color: 'from-blue-500/20 to-blue-600/5' },
          { label: 'Uptime', value: health ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` : '--', sub: `${stats?.cpu.cores ?? '--'} cores`, color: 'from-purple-500/20 to-purple-600/5' },
        ].map((m) => (
          <div key={m.label} className={`glass bg-gradient-to-br ${m.color} p-4`}>
            <p className="text-xs text-vestara-text-muted">{m.label}</p>
            <p className="mt-1 text-2xl font-bold text-vestara-text">{m.value}</p>
            <p className="mt-0.5 text-[10px] text-vestara-text-dim truncate">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* CPU History */}
        <div className="glass p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-vestara-gold">CPU Usage</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cpuHistory}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#666' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#666' }} />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#999' }}
                />
                <Area type="monotone" dataKey="value" stroke="#d4af37" fill="url(#cpuGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gauge */}
        <div className="glass p-4">
          <h2 className="mb-3 text-sm font-semibold text-vestara-gold">System Load</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" barSize={14} data={gaugeData} startAngle={180} endAngle={0}>
                <RadialBar background dataKey="value" />
                <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', color: '#999' }} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Memory History */}
        <div className="glass p-4">
          <h2 className="mb-3 text-sm font-semibold text-vestara-gold">Memory Usage</h2>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={memHistory}>
                <defs>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#666' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#666' }} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="value" stroke="#4ade80" fill="url(#memGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Disk pie */}
        <div className="glass p-4">
          <h2 className="mb-3 text-sm font-semibold text-vestara-gold">Disk Usage</h2>
          <div className="h-40 flex items-center justify-center">
            {stats ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={diskPie} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                    {diskPie.map((_, i) => <Cell key={i} fill={i === 0 ? '#60a5fa' : 'rgba(255,255,255,0.05)'} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatBytes(Number(v))} contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-vestara-text-dim">Loading...</p>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="glass p-4">
          <h2 className="mb-3 text-sm font-semibold text-vestara-gold">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map((link) => (
              <a key={link.href} href={link.href} className="flex items-center gap-2 rounded-lg border border-vestara-glass-border px-3 py-2.5 text-sm text-vestara-text-muted transition-colors hover:border-vestara-gold/30 hover:text-vestara-text">
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
