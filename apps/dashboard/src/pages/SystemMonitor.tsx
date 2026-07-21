import { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend } from 'recharts';

interface SystemInfo {
  cpu: { model: string; cores: number; usage: number; temperature: number };
  memory: { total: number; used: number; free: number; usage: number };
  disk: { total: number; used: number; free: number; usage: number };
  network: { interfaces: Array<{ name: string; ip: string; rx: number; tx: number }> };
  uptime: number;
  loadAvg: number[];
  processes: number;
}

interface Process {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: string;
}

const COLORS = ['#d4af37', '#4ade80', '#60a5fa', '#f87171', '#a78bfa', '#facc15'];

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  R: { label: 'running', class: 'bg-green-500/20 text-green-400' },
  S: { label: 'sleeping', class: 'bg-yellow-500/20 text-yellow-400' },
  D: { label: 'disk sleep', class: 'bg-orange-500/20 text-orange-400' },
  Z: { label: 'zombie', class: 'bg-red-500/20 text-red-400' },
  T: { label: 'stopped', class: 'bg-white/10 text-vestara-text-dim' },
  I: { label: 'idle', class: 'bg-blue-500/20 text-blue-400' },
};

const statusDisplay = (code: string) => STATUS_MAP[code] || { label: code, class: 'bg-white/5 text-vestara-text-dim' };

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const getUsageColor = (usage: number) => {
  if (usage >= 90) return 'text-red-400';
  if (usage >= 70) return 'text-yellow-400';
  return 'text-green-400';
};

export default function SystemMonitor() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(3);
  const [cpuHistory, setCpuHistory] = useState<Array<{ time: string; value: number }>>([]);
  const [memHistory, setMemHistory] = useState<Array<{ time: string; value: number }>>([]);
  const [netHistory, setNetHistory] = useState<Array<{ time: string; rx: number; tx: number }>>([]);

  const fetchData = useCallback(async () => {
    try {
      const [sysRes, procRes] = await Promise.all([
        fetch('/api/system/info'),
        fetch('/api/system/processes?limit=15'),
      ]);

      if (sysRes.ok) {
        const data = await sysRes.json();
        setSystemInfo(data);
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setCpuHistory((prev) => [...prev.slice(-59), { time: now, value: data.cpu.usage }]);
        setMemHistory((prev) => [...prev.slice(-59), { time: now, value: data.memory.usage }]);
        if (data.network.interfaces.length > 0) {
          const iface = data.network.interfaces[0];
          setNetHistory((prev) => [...prev.slice(-59), { time: now, rx: iface.rx, tx: iface.tx }]);
        }
      }
      if (procRes.ok) {
        const procData = await procRes.json();
        setProcesses(procData.processes || []);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  const gaugeData = systemInfo ? [
    { name: 'CPU', value: systemInfo.cpu.usage, fill: '#d4af37' },
    { name: 'RAM', value: systemInfo.memory.usage, fill: '#4ade80' },
    { name: 'Disk', value: systemInfo.disk.usage, fill: '#60a5fa' },
  ] : [];

  const diskPie = systemInfo ? [
    { name: 'Used', value: systemInfo.disk.used },
    { name: 'Free', value: systemInfo.disk.free },
  ] : [];

  const processChart = processes.slice(0, 8).map((p) => ({ name: p.name.slice(0, 12), cpu: p.cpu, mem: p.memory }));

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-vestara-text-muted">Loading system info...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-vestara-text">System Monitor</h1>
          <p className="text-sm text-vestara-text-muted">Real-time resource monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="rounded-lg border border-vestara-glass-border bg-vestara-bg px-3 py-2 text-sm text-vestara-text outline-none"
          >
            <option value={1}>1s</option>
            <option value={3}>3s</option>
            <option value={5}>5s</option>
            <option value={10}>10s</option>
          </select>
          <button onClick={fetchData} className="btn-gold px-4 py-2 text-sm">Refresh</button>
        </div>
      </div>

      {/* Top stats */}
      {systemInfo && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Uptime', value: formatUptime(systemInfo.uptime) },
            { label: 'Load Avg', value: systemInfo.loadAvg.map((l) => l.toFixed(2)).join(' / ') },
            { label: 'Processes', value: String(systemInfo.processes) },
            { label: 'CPU Cores', value: String(systemInfo.cpu.cores) },
          ].map((s) => (
            <div key={s.label} className="glass p-4">
              <p className="text-xs text-vestara-text-muted">{s.label}</p>
              <p className="mt-1 text-lg font-bold text-vestara-text">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* CPU + Memory history */}
        <div className="glass p-4 lg:col-span-2">
          <div className="flex items-center gap-6 mb-3">
            <h2 className="text-sm font-semibold text-vestara-gold">Resource History</h2>
            <div className="flex items-center gap-4 text-[10px] text-vestara-text-dim">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> CPU</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-400" /> Memory</span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cpuHistory.map((c, i) => ({ ...c, mem: memHistory[i]?.value || 0 }))}>
                <defs>
                  <linearGradient id="cpuG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="memG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#666' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#666' }} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="value" stroke="#f59e0b" fill="url(#cpuG)" strokeWidth={2} />
                <Area type="monotone" dataKey="mem" stroke="#4ade80" fill="url(#memG)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gauges */}
        <div className="glass p-4">
          <h2 className="mb-3 text-sm font-semibold text-vestara-gold">System Load</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="15%" outerRadius="85%" barSize={12} data={gaugeData} startAngle={180} endAngle={0}>
                <RadialBar background dataKey="value" />
                <Legend iconSize={8} layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', color: '#999' }} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Network chart */}
        <div className="glass p-4">
          <h2 className="mb-3 text-sm font-semibold text-vestara-gold">Network I/O</h2>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netHistory}>
                <defs>
                  <linearGradient id="rxG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="txG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#666' }} />
                <YAxis tick={{ fontSize: 9, fill: '#666' }} tickFormatter={(v) => formatBytes(v)} />
                <Tooltip formatter={(v) => formatBytes(Number(v))} contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="rx" stroke="#60a5fa" fill="url(#rxG)" strokeWidth={2} name="Download" />
                <Area type="monotone" dataKey="tx" stroke="#a78bfa" fill="url(#txG)" strokeWidth={2} name="Upload" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Disk pie */}
        <div className="glass p-4">
          <h2 className="mb-3 text-sm font-semibold text-vestara-gold">Disk</h2>
          <div className="h-40 flex items-center">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie data={diskPie} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value">
                  {diskPie.map((_, i) => <Cell key={i} fill={i === 0 ? '#60a5fa' : 'rgba(255,255,255,0.05)'} />)}
                </Pie>
                <Tooltip formatter={(v) => formatBytes(Number(v))} contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-vestara-text-muted">Used</span><span className="text-vestara-text">{formatBytes(systemInfo?.disk.used || 0)}</span></div>
              <div className="flex justify-between"><span className="text-vestara-text-muted">Free</span><span className="text-vestara-text">{formatBytes(systemInfo?.disk.free || 0)}</span></div>
              <div className="flex justify-between"><span className="text-vestara-text-muted">Total</span><span className="text-vestara-text">{formatBytes(systemInfo?.disk.total || 0)}</span></div>
            </div>
          </div>
        </div>

        {/* Top processes bar chart */}
        <div className="glass p-4">
          <h2 className="mb-3 text-sm font-semibold text-vestara-gold">Top Processes</h2>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processChart} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#666' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#999' }} width={70} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="cpu" fill="#d4af37" radius={[0, 4, 4, 0]} name="CPU %" />
                <Bar dataKey="mem" fill="#4ade80" radius={[0, 4, 4, 0]} name="RAM %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Processes table */}
      {processes.length > 0 && (
        <div className="glass overflow-hidden">
          <div className="px-4 py-3 border-b border-vestara-glass-border">
            <h2 className="text-sm font-semibold text-vestara-gold">All Processes</h2>
          </div>
          <div className="overflow-auto max-h-64">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-vestara-text-muted border-b border-vestara-glass-border">
                  <th className="px-4 py-2">PID</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">CPU%</th>
                  <th className="px-4 py-2">RAM%</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((proc) => (
                  <tr key={proc.pid} className="border-b border-vestara-glass-border/50 hover:bg-white/[0.02]">
                    <td className="px-4 py-2 text-vestara-text-dim">{proc.pid}</td>
                    <td className="px-4 py-2 text-vestara-text">{proc.name}</td>
                    <td className="px-4 py-2"><span className={getUsageColor(proc.cpu)}>{proc.cpu.toFixed(1)}%</span></td>
                    <td className="px-4 py-2"><span className={getUsageColor(proc.memory)}>{proc.memory.toFixed(1)}%</span></td>
                    <td className="px-4 py-2">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${statusDisplay(proc.status).class}`}>
                        {statusDisplay(proc.status).label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Network interfaces */}
      {systemInfo && systemInfo.network.interfaces.length > 0 && (
        <div className="glass p-4">
          <h2 className="mb-3 text-sm font-semibold text-vestara-gold">Network Interfaces</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {systemInfo.network.interfaces.map((iface) => (
              <div key={`${iface.name}-${iface.ip}`} className="rounded-lg border border-vestara-glass-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-vestara-text">{iface.name}</span>
                  <span className="text-xs text-vestara-text-dim">{iface.ip || 'No IP'}</span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="text-green-400">↓ {formatBytes(iface.rx)}</span>
                  <span className="text-blue-400">↑ {formatBytes(iface.tx)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
