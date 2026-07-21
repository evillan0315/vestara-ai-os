import { useState, useEffect, useCallback, useRef } from 'react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  source: string;
  message: string;
  details?: Record<string, unknown>;
}

interface OsLogEntry {
  timestamp: string;
  level: string;
  message: string;
}

const LEVEL_COLORS: Record<string, string> = {
  error: 'text-red-400 bg-red-500/10 border-red-500/20',
  warn: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  warning: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  debug: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  notice: 'text-green-400 bg-green-500/10 border-green-500/20',
  emerg: 'text-red-400 bg-red-500/10 border-red-500/20',
  alert: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  crit: 'text-red-400 bg-red-500/10 border-red-500/20',
  err: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const LEVEL_BADGES: Record<string, string> = {
  error: 'bg-red-500/20 text-red-400',
  warn: 'bg-yellow-500/20 text-yellow-400',
  warning: 'bg-yellow-500/20 text-yellow-400',
  info: 'bg-blue-500/20 text-blue-400',
  debug: 'bg-gray-500/20 text-gray-400',
  notice: 'bg-green-500/20 text-green-400',
  emerg: 'bg-red-500/20 text-red-400',
  alert: 'bg-orange-500/20 text-orange-400',
  crit: 'bg-red-500/20 text-red-400',
  err: 'bg-red-500/20 text-red-400',
};

const LEVEL_ORDER = ['error', 'warn', 'info', 'debug'];
const LOG_LEVELS = ['all', 'error', 'warn', 'info', 'debug'];

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function isErrorLike(level: string) {
  return ['error', 'err', 'emerg', 'alert', 'crit'].includes(level);
}

function isWarnLike(level: string) {
  return ['warn', 'warning'].includes(level);
}

type Tab = 'app' | 'os' | 'errors';

export default function Logs() {
  const [activeTab, setActiveTab] = useState<Tab>('app');
  const [appLogs, setAppLogs] = useState<LogEntry[]>([]);
  const [osLogs, setOsLogs] = useState<OsLogEntry[]>([]);
  const [errors, setErrors] = useState<LogEntry[]>([]);
  const [osErrors, setOsErrors] = useState<OsLogEntry[]>([]);
  const [alerts, setAlerts] = useState<LogEntry[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchAppLogs = useCallback(async () => {
    try {
      const url = filterLevel === 'all'
        ? '/api/system/logs?limit=200'
        : `/api/system/logs?limit=200&level=${filterLevel}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAppLogs(data.entries || []);
        setTotalLogs(data.total || 0);
      }
    } catch {}
  }, [filterLevel]);

  const fetchOsLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/system/logs/os?lines=100');
      if (res.ok) {
        const data = await res.json();
        setOsLogs(data.entries || []);
      }
    } catch {}
  }, []);

  const fetchErrors = useCallback(async () => {
    try {
      const res = await fetch('/api/system/logs/errors');
      if (res.ok) {
        const data = await res.json();
        setErrors(data.errors || []);
        setOsErrors(data.osErrors || []);
        setAlerts(data.alerts || []);
      }
    } catch {}
  }, []);

  const clearLogs = async () => {
    try {
      await fetch('/api/system/logs/clear', { method: 'POST' });
      setAppLogs([]);
      setTotalLogs(0);
    } catch {}
  };

  useEffect(() => {
    fetchAppLogs();
    fetchOsLogs();
    fetchErrors();
    setLoading(false);
  }, [fetchAppLogs, fetchOsLogs, fetchErrors]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAppLogs();
      fetchErrors();
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAppLogs, fetchErrors]);

  const filteredOsLogs = filterLevel === 'all'
    ? osLogs
    : osLogs.filter((e) => {
        if (filterLevel === 'error') return isErrorLike(e.level);
        if (filterLevel === 'warn') return isWarnLike(e.level);
        return e.level === filterLevel;
      });

  const allErrors = [...errors, ...osErrors.map((e) => ({
    id: e.timestamp + Math.random(),
    timestamp: e.timestamp,
    level: 'error',
    source: 'system',
    message: e.message,
  } as LogEntry))].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-vestara-text">Logs</h1>
          <p className="text-sm text-vestara-text-muted">Application, system, and error logs</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-vestara-text-muted">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-vestara-glass-border bg-vestara-bg"
            />
            Auto-refresh
          </label>
          {activeTab === 'app' && (
            <button onClick={clearLogs} className="rounded-lg border border-vestara-glass-border px-3 py-1.5 text-xs text-vestara-text-muted hover:text-vestara-text hover:bg-white/5">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border border-vestara-glass-border overflow-hidden">
          {(['app', 'os', 'errors'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-vestara-gold/10 text-vestara-gold'
                  : 'text-vestara-text-muted hover:text-vestara-text hover:bg-white/5'
              }`}
            >
              {tab === 'app' ? 'Application' : tab === 'os' ? 'System' : 'Errors'}
            </button>
          ))}
        </div>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="rounded-lg border border-vestara-glass-border bg-vestara-bg px-3 py-1.5 text-xs text-vestara-text outline-none"
        >
          {LOG_LEVELS.map((l) => (
            <option key={l} value={l}>{l === 'all' ? 'All Levels' : l.charAt(0).toUpperCase() + l.slice(1)}</option>
          ))}
        </select>
        <span className="text-xs text-vestara-text-dim">
          {activeTab === 'app' && `${appLogs.length} shown (${totalLogs} total)`}
          {activeTab === 'os' && `${filteredOsLogs.length} entries`}
          {activeTab === 'errors' && `${allErrors.length} errors`}
        </span>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-sm text-vestara-text-muted">Loading logs...</div>
        </div>
      ) : (
        <div ref={scrollRef} className="glass max-h-[calc(100vh-18rem)] overflow-auto">
          {activeTab === 'app' && (
            <div className="divide-y divide-vestara-glass-border/50">
              {appLogs.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-vestara-text-dim">No log entries yet</div>
              ) : (
                appLogs.map((entry) => (
                  <div
                    key={entry.id}
                    className={`px-4 py-2.5 hover:bg-white/[0.02] cursor-pointer transition-colors ${
                      entry.level === 'error' ? 'border-l-2 border-l-red-500/40' :
                      entry.level === 'warn' ? 'border-l-2 border-l-yellow-500/40' : ''
                    }`}
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    <div className="flex items-center gap-3 text-xs">
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${LEVEL_BADGES[entry.level] || LEVEL_BADGES.info}`}>
                        {entry.level.toUpperCase()}
                      </span>
                      <span className="shrink-0 text-vestara-text-dim font-mono">{formatTimestamp(entry.timestamp)}</span>
                      <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-vestara-text-dim font-mono">{entry.source}</span>
                      <span className="flex-1 truncate text-vestara-text">{entry.message}</span>
                    </div>
                    {expandedId === entry.id && entry.details && (
                      <pre className="mt-2 ml-1 overflow-x-auto rounded bg-vestara-bg p-2 text-[10px] text-vestara-text-dim font-mono">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'os' && (
            <div className="divide-y divide-vestara-glass-border/50">
              {filteredOsLogs.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-vestara-text-dim">No system logs available (journalctl not available or insufficient permissions)</div>
              ) : (
                filteredOsLogs.map((entry, i) => (
                  <div
                    key={i}
                    className={`px-4 py-2.5 ${
                      isErrorLike(entry.level) ? 'border-l-2 border-l-red-500/40' :
                      isWarnLike(entry.level) ? 'border-l-2 border-l-yellow-500/40' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3 text-xs">
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${LEVEL_BADGES[entry.level] || LEVEL_BADGES.info}`}>
                        {(entry.level === 'err' ? 'error' : entry.level).toUpperCase()}
                      </span>
                      <span className="shrink-0 text-vestara-text-dim font-mono whitespace-nowrap">{formatTimestamp(entry.timestamp)}</span>
                      <span className="text-vestara-text break-all">{entry.message}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'errors' && (
            <div className="divide-y divide-vestara-glass-border/50">
              {/* Alerts section */}
              {alerts.length > 0 && (
                <>
                  <div className="bg-yellow-500/5 px-4 py-2">
                    <h3 className="text-xs font-semibold text-yellow-400">Alerts ({alerts.length})</h3>
                  </div>
                  {alerts.map((entry) => (
                    <div key={entry.id} className="border-l-2 border-l-yellow-500/40 px-4 py-2.5 hover:bg-white/[0.02]">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-yellow-500/20 text-yellow-400">WARN</span>
                        <span className="shrink-0 text-vestara-text-dim font-mono">{formatTimestamp(entry.timestamp)}</span>
                        <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-vestara-text-dim font-mono">{entry.source}</span>
                        <span className="flex-1 truncate text-vestara-text">{entry.message}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Errors section */}
              <div className={`${alerts.length > 0 ? 'border-t border-vestara-glass-border/50' : ''} bg-red-500/5 px-4 py-2`}>
                <h3 className="text-xs font-semibold text-red-400">Errors ({allErrors.length})</h3>
              </div>
              {allErrors.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-vestara-text-dim">No errors recorded</div>
              ) : (
                allErrors.map((entry, i) => (
                  <div
                    key={entry.id || i}
                    className="border-l-2 border-l-red-500/40 px-4 py-2.5 hover:bg-white/[0.02]"
                  >
                    <div className="flex items-start gap-3 text-xs">
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-500/20 text-red-400">ERROR</span>
                      <span className="shrink-0 text-vestara-text-dim font-mono whitespace-nowrap">{formatTimestamp(entry.timestamp)}</span>
                      <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-vestara-text-dim font-mono">{entry.source || 'system'}</span>
                      <span className="text-vestara-text break-all">{entry.message}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
