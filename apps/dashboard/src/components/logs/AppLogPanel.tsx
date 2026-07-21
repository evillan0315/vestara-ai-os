import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { LogEntryRow, type LogEntry } from './LogEntryRow';

interface AppLogPanelProps {
  autoRefresh: boolean;
}

function stableLogId(entry: LogEntry, index: number): string {
  return entry.id || `log-${index}`;
}

export function AppLogPanel({ autoRefresh }: AppLogPanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterSource, setFilterSource] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasOlder, setHasOlder] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  const buildUrl = useCallback((before?: string) => {
    const params = new URLSearchParams();
    params.set('limit', '200');
    if (filterLevel !== 'all') params.set('level', filterLevel);
    if (filterSource) params.set('source', filterSource);
    if (searchQuery) params.set('q', searchQuery);
    if (before) params.set('before', before);
    return `/api/system/logs?${params.toString()}`;
  }, [filterLevel, filterSource, searchQuery]);

  const fetchLogs = useCallback(async (before?: string) => {
    try {
      const res = await fetch(buildUrl(before));
      if (res.ok) {
        const data = await res.json();
        if (before) {
          setLogs(prev => [...prev, ...data.entries]);
          setHasOlder(data.entries.length >= 200);
        } else {
          setLogs(data.entries || []);
          setTotal(data.total || 0);
          setHasOlder((data.entries || []).length >= 200);
        }
        if (data.sources) setSources(data.sources);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [buildUrl]);

  // Initial fetch + auto-refresh
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchLogs(), 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  // Track scroll position for tail behavior
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    userScrolledUpRef.current = !atBottom;
  }, []);

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (!userScrolledUpRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length]);

  const loadOlder = () => {
    if (logs.length === 0) return;
    fetchLogs(logs[0].timestamp);
  };

  // Level distribution for sparkline
  const levelCounts = useMemo(() => {
    const counts = { error: 0, warn: 0, info: 0, debug: 0 };
    for (const log of logs) {
      const key = log.level as keyof typeof counts;
      if (key in counts) counts[key]++;
    }
    return counts;
  }, [logs]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-sm text-vestara-text-muted">Loading logs...</div>;
  }

  return (
    <div>
      {/* Sparkline + search row */}
      <div className="flex items-center gap-3 mb-3">
        {/* Mini level chart */}
        <div className="flex gap-1.5 items-center shrink-0">
          {(['error', 'warn', 'info', 'debug'] as const).map((lvl) => {
            const count = levelCounts[lvl];
            const maxCount = Math.max(...Object.values(levelCounts), 1);
            const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const colors: Record<string, string> = { error: 'bg-red-500', warn: 'bg-yellow-500', info: 'bg-blue-500', debug: 'bg-gray-500' };
            return (
              <div key={lvl} className="flex flex-col items-center gap-0.5">
                <div className="h-8 w-2 bg-white/5 rounded-sm relative overflow-hidden">
                  <div
                    className={`absolute bottom-0 w-full ${colors[lvl]} rounded-sm transition-all duration-500`}
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <span className="text-[8px] text-vestara-text-dim">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
            className="w-full rounded-lg border border-vestara-glass-border bg-vestara-bg px-3 py-1.5 pl-8 text-xs text-vestara-text outline-none placeholder:text-vestara-text-dim"
          />
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vestara-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Level filter */}
        <select
          value={filterLevel}
          onChange={(e) => { setFilterLevel(e.target.value); }}
          className="rounded-lg border border-vestara-glass-border bg-vestara-bg px-2 py-1.5 text-xs text-vestara-text outline-none"
        >
          <option value="all">All Levels</option>
          <option value="error">Error</option>
          <option value="warn">Warn</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>

        {/* Source filter */}
        <select
          value={filterSource}
          onChange={(e) => { setFilterSource(e.target.value); }}
          className="rounded-lg border border-vestara-glass-border bg-vestara-bg px-2 py-1.5 text-xs text-vestara-text outline-none"
        >
          <option value="">All Sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <span className="text-xs text-vestara-text-dim whitespace-nowrap">
          {logs.length} shown ({total} total)
        </span>
      </div>

      {/* Log list */}
      <div ref={scrollRef} onScroll={handleScroll} className="glass max-h-[calc(100vh-22rem)] overflow-auto">
        {logs.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-vestara-text-dim">No log entries yet</div>
        ) : (
          <div className="divide-y divide-vestara-glass-border/50">
            {logs.map((entry, i) => (
              <LogEntryRow key={stableLogId(entry, i)} entry={entry} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Load Older / Export bar */}
      <div className="flex items-center justify-between mt-2">
        {hasOlder && (
          <button
            onClick={loadOlder}
            className="rounded-lg border border-vestara-glass-border px-3 py-1 text-xs text-vestara-text-muted hover:text-vestara-text hover:bg-white/5 transition-colors"
          >
            Load older entries
          </button>
        )}
        {!hasOlder && <div />}
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const res = await fetch('/api/system/logs/export?format=json');
              const data = await res.json();
              const blob = new Blob([JSON.stringify(data.content, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = data.filename; a.click();
              URL.revokeObjectURL(url);
            }}
            className="rounded-lg border border-vestara-glass-border px-2 py-1 text-[10px] text-vestara-text-dim hover:text-vestara-text hover:bg-white/5 transition-colors"
          >
            Export JSON
          </button>
          <button
            onClick={async () => {
              const res = await fetch('/api/system/logs/export?format=text');
              const data = await res.json();
              const blob = new Blob([data.content], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = data.filename; a.click();
              URL.revokeObjectURL(url);
            }}
            className="rounded-lg border border-vestara-glass-border px-2 py-1 text-[10px] text-vestara-text-dim hover:text-vestara-text hover:bg-white/5 transition-colors"
          >
            Export TXT
          </button>
        </div>
      </div>
    </div>
  );
}
