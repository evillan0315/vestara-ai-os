import { useState, useEffect } from 'react';

interface SystemInfo {
  cpu: {
    model: string;
    cores: number;
    usage: number;
    temperature: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
    interfaces: Array<{
      name: string;
      ip: string;
      rx: number;
      tx: number;
    }>;
  };
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

export default function SystemMonitor() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);

  useEffect(() => {
    fetchSystemInfo();
    const interval = setInterval(fetchSystemInfo, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const fetchSystemInfo = async () => {
    try {
      const [sysRes, procRes] = await Promise.all([
        fetch('/api/system/info'),
        fetch('/api/system/processes?limit=20'),
      ]);

      if (sysRes.ok) {
        const sysData = await sysRes.json();
        setSystemInfo(sysData);
      }

      if (procRes.ok) {
        const procData = await procRes.json();
        setProcesses(procData.processes || []);
      }
    } catch (error) {
      console.error('Failed to fetch system info:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const getUsageBarColor = (usage: number) => {
    if (usage >= 90) return 'bg-red-500';
    if (usage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getBarColor = (usage: number) => {
    if (usage >= 90) return 'bg-red-500';
    if (usage >= 70) return 'bg-yellow-500';
    return 'bg-[#4a9eff]';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="text-[#4a9eff] text-lg">Loading system info...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">System Monitor</h1>
            <p className="text-gray-400 mt-1">Real-time system resource monitoring</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="px-3 py-2 bg-[#12121e] border border-[#1e1e2e] rounded-lg text-sm"
            >
              <option value={1}>1s refresh</option>
              <option value={5}>5s refresh</option>
              <option value={10}>10s refresh</option>
              <option value={30}>30s refresh</option>
            </select>
            <button
              onClick={fetchSystemInfo}
              className="px-4 py-2 bg-[#4a9eff] rounded-lg hover:bg-[#3a8eef] transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {systemInfo && (
          <>
            {/* System Overview */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-4">
                <div className="text-gray-400 text-sm">Uptime</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {formatUptime(systemInfo.uptime)}
                </div>
              </div>
              <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-4">
                <div className="text-gray-400 text-sm">Load Average</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {systemInfo.loadAvg.map(l => l.toFixed(2)).join(' / ')}
                </div>
              </div>
              <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-4">
                <div className="text-gray-400 text-sm">Processes</div>
                <div className="text-2xl font-bold text-white mt-1">{systemInfo.processes}</div>
              </div>
              <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-4">
                <div className="text-gray-400 text-sm">CPU Cores</div>
                <div className="text-2xl font-bold text-white mt-1">{systemInfo.cpu.cores}</div>
              </div>
            </div>

            {/* Resource Cards */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              {/* CPU */}
              <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">CPU</h3>
                  <span className={`text-2xl font-bold ${getUsageColor(systemInfo.cpu.usage)}`}>
                    {systemInfo.cpu.usage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-[#1a1a2e] rounded-full h-3 mb-3">
                  <div
                    className={`h-3 rounded-full transition-all ${getBarColor(systemInfo.cpu.usage)}`}
                    style={{ width: `${systemInfo.cpu.usage}%` }}
                  />
                </div>
                <div className="text-sm text-gray-400">
                  <div className="truncate">{systemInfo.cpu.model}</div>
                  <div className="mt-1">
                    Temperature: <span className={getUsageColor(systemInfo.cpu.temperature / 100 * 100)}>
                      {systemInfo.cpu.temperature}°C
                    </span>
                  </div>
                </div>
              </div>

              {/* Memory */}
              <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Memory</h3>
                  <span className={`text-2xl font-bold ${getUsageColor(systemInfo.memory.usage)}`}>
                    {systemInfo.memory.usage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-[#1a1a2e] rounded-full h-3 mb-3">
                  <div
                    className={`h-3 rounded-full transition-all ${getBarColor(systemInfo.memory.usage)}`}
                    style={{ width: `${systemInfo.memory.usage}%` }}
                  />
                </div>
                <div className="text-sm text-gray-400">
                  <div>{formatBytes(systemInfo.memory.used)} / {formatBytes(systemInfo.memory.total)}</div>
                  <div className="mt-1">Free: {formatBytes(systemInfo.memory.free)}</div>
                </div>
              </div>

              {/* Disk */}
              <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Disk</h3>
                  <span className={`text-2xl font-bold ${getUsageColor(systemInfo.disk.usage)}`}>
                    {systemInfo.disk.usage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-[#1a1a2e] rounded-full h-3 mb-3">
                  <div
                    className={`h-3 rounded-full transition-all ${getBarColor(systemInfo.disk.usage)}`}
                    style={{ width: `${systemInfo.disk.usage}%` }}
                  />
                </div>
                <div className="text-sm text-gray-400">
                  <div>{formatBytes(systemInfo.disk.used)} / {formatBytes(systemInfo.disk.total)}</div>
                  <div className="mt-1">Free: {formatBytes(systemInfo.disk.free)}</div>
                </div>
              </div>
            </div>

            {/* Network Interfaces */}
            {systemInfo.network.interfaces.length > 0 && (
              <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Network</h3>
                <div className="grid grid-cols-2 gap-4">
                  {systemInfo.network.interfaces.map((iface) => (
                    <div key={iface.name} className="bg-[#0a0a12] rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{iface.name}</span>
                        <span className="text-gray-400 text-sm">{iface.ip || 'No IP'}</span>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className="text-green-400">↓ {formatBytes(iface.rx)}</span>
                        <span className="text-blue-400">↑ {formatBytes(iface.tx)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Processes */}
            {processes.length > 0 && (
              <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Top Processes</h3>
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm border-b border-[#1e1e2e]">
                      <th className="pb-2">PID</th>
                      <th className="pb-2">Name</th>
                      <th className="pb-2">CPU%</th>
                      <th className="pb-2">Memory%</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processes.map((proc) => (
                      <tr key={proc.pid} className="border-b border-[#1e1e2e]/50">
                        <td className="py-2 text-gray-300">{proc.pid}</td>
                        <td className="py-2 text-white">{proc.name}</td>
                        <td className="py-2">
                          <span className={getUsageColor(proc.cpu)}>{proc.cpu.toFixed(1)}%</span>
                        </td>
                        <td className="py-2">
                          <span className={getUsageColor(proc.memory)}>{proc.memory.toFixed(1)}%</span>
                        </td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            proc.status === 'running' ? 'bg-green-500/20 text-green-400' :
                            proc.status === 'sleeping' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {proc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
