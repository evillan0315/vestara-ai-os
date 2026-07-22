import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppLogPanel } from '../components/logs/AppLogPanel';
import { OsLogPanel } from '../components/logs/OsLogPanel';
import { ErrorLogPanel } from '../components/logs/ErrorLogPanel';
import { ConfirmDialog } from '../components/ConfirmDialog';

type Tab = 'app' | 'os' | 'errors';

export default function Logs() {
  const [activeTab, setActiveTab] = useState<Tab>('app');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [appLogCount, setAppLogCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket listener for log:entry events (live tail)
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
            // broadcast sends { event, data, timestamp }
            if (msg.type === 'connected') return;
            const ev = msg.event || msg.type;
            if (ev === 'log:entry') {
              // Bump the error count badge when on another tab
              const logLevel = msg.data?.level;
              if (logLevel === 'error') {
                setErrorCount(prev => prev + 1);
              }
            }
          } catch {}
        };

        ws.onclose = () => {
          reconnectTimer = setTimeout(connect, 5000);
        };
        ws.onerror = () => {};
      } catch {}
    };

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current = null;
    };
  }, []);

  // Reset badge when switching to the errors tab
  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'errors') setErrorCount(0);
    if (tab === 'app') setAppLogCount(0);
  }, []);

  const clearLogs = useCallback(async () => {
    try {
      await fetch('/api/system/logs/clear', { method: 'POST' });
      setAppLogCount(0);
      setErrorCount(0);
    } catch {}
    setShowClearConfirm(false);
  }, []);

  const tabMeta = useMemo(() => ({
    app: { label: 'Application', badge: appLogCount || undefined },
    os: { label: 'System', badge: undefined },
    errors: { label: 'Errors', badge: errorCount || undefined },
  } as const satisfies Record<Tab, { label: string; badge?: number }>), [appLogCount, errorCount]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-6 p-4 md:p-6">
      <div className="w-full flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-vestara-text">Logs</h1>
          <p className="text-sm text-vestara-text-muted">Application, system, and error logs</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-vestara-text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-vestara-glass-border bg-vestara-bg"
            />
            Auto-refresh
          </label>
          {activeTab === 'app' && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="rounded-lg border border-vestara-glass-border px-3 py-1.5 text-xs text-vestara-text-muted hover:text-vestara-text hover:bg-white/5 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border border-vestara-glass-border overflow-hidden">
          {(['app', 'os', 'errors'] as Tab[]).map((tab) => {
            const meta = tabMeta[tab];
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-vestara-gold/10 text-vestara-gold'
                    : 'text-vestara-text-muted hover:text-vestara-text hover:bg-white/5'
                }`}
              >
                {meta.label}
                {meta.badge !== undefined && meta.badge > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                    tab === 'errors' ? 'bg-red-500/20 text-red-400' : 'bg-vestara-gold/20 text-vestara-gold'
                  }`}>
                    {meta.badge > 99 ? '99+' : meta.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab panels */}
      {activeTab === 'app' && <AppLogPanel autoRefresh={autoRefresh} />}
      {activeTab === 'os' && <OsLogPanel />}
      {activeTab === 'errors' && <ErrorLogPanel />}

      {/* Confirm clear dialog */}
      <ConfirmDialog
        open={showClearConfirm}
        title="Clear Logs"
        message="Are you sure you want to clear all application logs? This cannot be undone."
        confirmLabel="Clear"
        variant="danger"
        onConfirm={clearLogs}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
