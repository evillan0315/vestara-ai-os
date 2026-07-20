import { useEffect, useState } from 'react';

interface Stats {
  cpu: number;
  ram: { used: number; total: number };
  disk: { used: number; total: number };
}

export function StatusBar() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/system/stats');
        if (res.ok) {
          const data = await res.json();
          setStats({
            cpu: data.cpu.usage,
            ram: { used: data.memory.used, total: data.memory.total },
            disk: { used: data.disk.used, total: data.disk.total },
          });
        }
      } catch {
        // API not available yet
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <footer className="flex items-center gap-6 border-t border-vestara-glass-border bg-vestara-surface/50 px-5 py-2 text-xs text-vestara-text-muted">
      <span>CPU {stats?.cpu ?? '--'}%</span>
      <span>RAM {stats ? formatBytes(stats.ram.used) : '--'}</span>
      <span>Disk {stats ? formatBytes(stats.disk.used) : '--'}</span>
      <span className="ml-auto">
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </footer>
  );
}
