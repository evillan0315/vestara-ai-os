import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSWR } from './useSWR';

export interface SystemStats {
  cpu: { usage: number; cores: number; model: string };
  memory: { total: number; used: number; free: number };
  disk: { total: number; used: number; free: number };
  uptime: number;
  loadAvg?: number[];
}

export interface HealthStatus {
  status: string;
  uptime: number;
  version: string;
  services: Record<string, string>;
}

export interface ChartPoint {
  time: string;
  value: number;
}

function authFetch(path: string) {
  const token = localStorage.getItem('vestara_token');
  return fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then((r) => {
    if (!r.ok) throw new Error(`${r.status}: ${r.statusText}`);
    return r.json();
  });
}

export function useDashboard() {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [cpuHistory, setCpuHistory] = useState<ChartPoint[]>([]);
  const [memHistory, setMemHistory] = useState<ChartPoint[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const appendStats = useCallback((data: SystemStats) => {
    setSystemStats(data);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setCpuHistory((prev) => [...prev.slice(-59), { time: now, value: data.cpu.usage }]);
    setMemHistory((prev) => [...prev.slice(-59), { time: now, value: Math.round((data.memory.used / data.memory.total) * 100) }]);
  }, []);

  const fetchLiveData = useCallback(async () => {
    try {
      const [healthRes, statsRes] = await Promise.all([
        fetch('/api/system/health'),
        fetch('/api/system/stats'),
      ]);
      if (healthRes.ok) setHealth(await healthRes.json());
      if (statsRes.ok) {
        appendStats(await statsRes.json());
      }
    } catch {}
  }, [appendStats]);

  // WebSocket subscription for real-time stats
  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws`;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === 'system:stats' && msg.data) {
              appendStats(msg.data);
            }
          } catch {}
        };

        ws.onclose = () => {
          reconnectTimer = setTimeout(connect, 5000);
        };

        ws.onerror = () => {
          // Suppress connection errors (handled by onclose)
        };
      } catch {}
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => ws?.close();
        } else {
          ws.close();
        }
      }
    };
  }, [appendStats]);

  // Polling fallback (3s)
  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 3000);
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  const key = typeof window !== 'undefined' && localStorage.getItem('vestara_token') ? 'dashboard' : null;

  const { data: pStats, loading: pLoading } = useSWR<any>(key ? '/api/projects/stats' : null, () => authFetch('/api/projects/stats'));
  const { data: convs } = useSWR<any>(key ? '/api/conversations?limit=5' : null, () => authFetch('/api/conversations?limit=5'));
  const { data: memories } = useSWR<any>(key ? '/api/memory/important?limit=3' : null, () => authFetch('/api/memory/important?limit=3'));
  const { data: memStats } = useSWR<any>(key ? '/api/memory/stats' : null, () => authFetch('/api/memory/stats'));
  const { data: kwStats } = useSWR<any>(key ? '/api/knowledge/stats' : null, () => authFetch('/api/knowledge/stats'));
  const { data: agentData } = useSWR<any>(key ? '/api/agents' : null, () => authFetch('/api/agents'));
  const { data: activityData } = useSWR<any>(key ? '/api/activity?limit=10' : null, () => authFetch('/api/activity?limit=10'));
  const { data: notifData } = useSWR<any>(key ? '/api/notifications?limit=10&unreadOnly=true' : null, () => authFetch('/api/notifications?limit=10&unreadOnly=true'));
  const { data: procData } = useSWR<any>(key ? '/api/system/processes' : null, () => authFetch('/api/system/processes'));

  const revalidate = useCallback(() => { fetchLiveData(); }, [fetchLiveData]);

  return useMemo(() => ({
    systemStats,
    health,
    cpuHistory,
    memHistory,
    projectStats: pStats,
    conversations: convs?.conversations || [],
    importantMemories: memories || [],
    memoryStats: memStats,
    knowledgeStats: kwStats,
    agents: agentData?.agents || [],
    activity: activityData?.activity || [],
    notifications: notifData?.notifications || [],
    unreadNotifications: notifData?.unreadCount || 0,
    processes: procData?.processes || [],
    loading: pLoading && !pStats,
    revalidate,
  }), [systemStats, health, cpuHistory, memHistory, pStats, convs, memories, memStats, kwStats, agentData, activityData, notifData, procData, pLoading, revalidate]);
}
