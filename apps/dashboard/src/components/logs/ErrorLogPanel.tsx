import { useState, useEffect, useCallback, useMemo } from 'react';
import { LogEntryRow, type LogEntry } from './LogEntryRow';

interface OsLogEntry {
  timestamp: string;
  level: string;
  message: string;
}

/** Stable ID for synthesized OS error entries */
function osErrorId(entry: OsLogEntry, index: number): string {
  return `os-${entry.timestamp}-${entry.message.slice(0, 40)}-${index}`;
}

/** Group consecutive identical messages */
function groupEntries(entries: LogEntry[]): Array<LogEntry & { count?: number }> {
  if (entries.length === 0) return [];
  const grouped: Array<LogEntry & { count?: number }> = [];
  for (const entry of entries) {
    const last = grouped[grouped.length - 1];
    if (last && last.message === entry.message && last.level === entry.level) {
      last.count = (last.count || 1) + 1;
    } else {
      grouped.push({ ...entry, count: undefined });
    }
  }
  return grouped;
}

export function ErrorLogPanel() {
  const [errors, setErrors] = useState<LogEntry[]>([]);
  const [osErrors, setOsErrors] = useState<OsLogEntry[]>([]);
  const [alerts, setAlerts] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/system/logs/errors');
        if (res.ok) {
          const data = await res.json();
          setErrors(data.errors || []);
          setOsErrors(data.osErrors || []);
          setAlerts(data.alerts || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  const allErrors = useMemo(() => {
    const merged: LogEntry[] = [
      ...errors,
      ...osErrors.map((e, i) => ({
        id: osErrorId(e, i),
        timestamp: e.timestamp,
        level: 'error',
        source: 'system',
        message: e.message,
      })),
    ];
    merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return merged;
  }, [errors, osErrors]);

  const groupedAlerts = useMemo(() => groupEntries(alerts), [alerts]);
  const groupedErrors = useMemo(() => groupEntries(allErrors), [allErrors]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-sm text-vestara-text-muted">Loading errors...</div>;
  }

  return (
    <div className="glass max-h-[calc(100vh-22rem)] overflow-auto divide-y divide-vestara-glass-border/50">
      {/* Alerts section */}
      {groupedAlerts.length > 0 && (
        <>
          <div className="bg-yellow-500/5 px-4 py-2 sticky top-0">
            <h3 className="text-xs font-semibold text-yellow-400">Alerts ({groupedAlerts.length})</h3>
          </div>
          {groupedAlerts.map((entry) => (
            <div key={entry.id} className="border-l-2 border-l-yellow-500/40">
              <LogEntryRow entry={entry} showSource />
              {entry.count && entry.count > 1 && (
                <div className="px-4 pb-1 text-[10px] text-vestara-text-dim">
                  Repeated {entry.count} times
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* Errors section */}
      <div className={`${groupedAlerts.length > 0 ? 'border-t border-vestara-glass-border/50' : ''} bg-red-500/5 px-4 py-2 sticky top-0`}>
        <h3 className="text-xs font-semibold text-red-400">Errors ({groupedErrors.length})</h3>
      </div>
      {groupedErrors.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-vestara-text-dim">No errors recorded</div>
      ) : (
        groupedErrors.map((entry) => (
          <div key={entry.id} className="border-l-2 border-l-red-500/40">
            <LogEntryRow entry={entry} showSource />
            {entry.count && entry.count > 1 && (
              <div className="px-4 pb-1 text-[10px] text-vestara-text-dim">
                Repeated {entry.count} times
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
