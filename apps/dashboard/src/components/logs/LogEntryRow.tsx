import { memo, useState } from 'react';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  source: string;
  message: string;
  details?: Record<string, unknown>;
}

interface LogEntryRowProps {
  entry: LogEntry;
  defaultExpanded?: boolean;
  showSource?: boolean;
}

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
  const d = new Date(ts);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatAbsoluteTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export const LogEntryRow = memo(function LogEntryRow({ entry, defaultExpanded, showSource = true }: LogEntryRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const text = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.source}] ${entry.message}${entry.details ? '\n' + JSON.stringify(entry.details, null, 2) : ''}`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div
      className={`px-4 py-2.5 hover:bg-white/[0.02] cursor-pointer transition-colors select-text ${
        isErrorLike(entry.level) ? 'border-l-2 border-l-red-500/40' :
        isWarnLike(entry.level) ? 'border-l-2 border-l-yellow-500/40' : ''
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3 text-xs">
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${LEVEL_BADGES[entry.level] || LEVEL_BADGES.info}`}>
          {entry.level.toUpperCase()}
        </span>
        <span className="shrink-0 text-vestara-text-dim font-mono whitespace-nowrap" title={formatAbsoluteTime(entry.timestamp)}>
          {formatRelativeTime(entry.timestamp)}
        </span>
        {showSource && (
          <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-vestara-text-dim font-mono">{entry.source}</span>
        )}
        <span className="flex-1 truncate text-vestara-text">{entry.message}</span>
        <button
          onClick={handleCopy}
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-vestara-text-dim hover:text-vestara-text hover:bg-white/10 transition-colors"
          title="Copy entry"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {expanded && entry.details && (
        <pre className="mt-2 ml-1 overflow-x-auto rounded bg-vestara-bg p-2 text-[10px] text-vestara-text-dim font-mono">
          {JSON.stringify(entry.details, null, 2)}
        </pre>
      )}
    </div>
  );
}, (prev, next) =>
  prev.entry.id === next.entry.id &&
  prev.defaultExpanded === next.defaultExpanded &&
  prev.showSource === next.showSource
);
