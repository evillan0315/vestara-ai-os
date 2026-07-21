import { useState, useEffect, useCallback, useMemo } from 'react';

interface OsLogEntry {
  timestamp: string;
  level: string;
  message: string;
}

function isErrorLike(level: string) {
  return ['error', 'err', 'emerg', 'alert', 'crit'].includes(level);
}
function isWarnLike(level: string) {
  return ['warn', 'warning'].includes(level);
}

function formatRelativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 5000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatAbsoluteTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const LEVEL_BADGES: Record<string, string> = {
  error: 'bg-red-500/20 text-red-400',
  err: 'bg-red-500/20 text-red-400',
  emerg: 'bg-red-500/20 text-red-400',
  alert: 'bg-orange-500/20 text-orange-400',
  crit: 'bg-red-500/20 text-red-400',
  warning: 'bg-yellow-500/20 text-yellow-400',
  warn: 'bg-yellow-500/20 text-yellow-400',
  notice: 'bg-green-500/20 text-green-400',
  info: 'bg-blue-500/20 text-blue-400',
  debug: 'bg-gray-500/20 text-gray-400',
};

/** Stable ID from timestamp+message for React reconciliation */
function osLogId(entry: OsLogEntry, index: number): string {
  return `${entry.timestamp}-${entry.message.slice(0, 40)}-${index}`;
}

export function OsLogPanel() {
  const [osLogs, setOsLogs] = useState<OsLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/system/logs/os?lines=100');
        if (res.ok) {
          const data = await res.json();
          setOsLogs(data.entries || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredOsLogs = useMemo(() => {
    if (filterLevel === 'all') return osLogs;
    return osLogs.filter((e) => {
      if (filterLevel === 'error') return isErrorLike(e.level);
      if (filterLevel === 'warn') return isWarnLike(e.level);
      return e.level === filterLevel;
    });
  }, [osLogs, filterLevel]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-sm text-vestara-text-muted">Loading system logs...</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="rounded-lg border border-vestara-glass-border bg-vestara-bg px-2 py-1.5 text-xs text-vestara-text outline-none"
        >
          <option value="all">All Levels</option>
          <option value="error">Error</option>
          <option value="warn">Warn</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
        <span className="text-xs text-vestara-text-dim">{filteredOsLogs.length} entries</span>
      </div>

      <div className="glass max-h-[calc(100vh-22rem)] overflow-auto">
        {filteredOsLogs.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-vestara-text-dim">
            No system logs available (journalctl not available or insufficient permissions)
          </div>
        ) : (
          <div className="divide-y divide-vestara-glass-border/50">
            {filteredOsLogs.map((entry, i) => (
              <div
                key={osLogId(entry, i)}
                className={`px-4 py-2.5 select-text ${
                  isErrorLike(entry.level) ? 'border-l-2 border-l-red-500/40' :
                  isWarnLike(entry.level) ? 'border-l-2 border-l-yellow-500/40' : ''
                }`}
              >
                <div className="flex items-start gap-3 text-xs">
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${LEVEL_BADGES[entry.level] || LEVEL_BADGES.info}`}>
                    {(entry.level === 'err' ? 'error' : entry.level).toUpperCase()}
                  </span>
                  <span className="shrink-0 text-vestara-text-dim font-mono whitespace-nowrap" title={formatAbsoluteTime(entry.timestamp)}>
                    {formatRelativeTime(entry.timestamp)}
                  </span>
                  <span className="text-vestara-text break-all">{entry.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
