import { randomUUID } from 'node:crypto';
import { exec } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { promisify } from 'node:util';
import type { VestaraApp } from '../types.js';

const execAsync = promisify(exec);

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
  details?: Record<string, unknown>;
}

const MAX_LOG_ENTRIES = 2000;

// Ring buffer: O(1) push, fixed memory
class LogBuffer {
  private entries: (LogEntry | null)[] = new Array(MAX_LOG_ENTRIES).fill(null);
  private head = 0;
  private count = 0;

  push(level: LogEntry['level'], source: string, message: string, details?: Record<string, unknown>) {
    this.entries[this.head] = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      details,
    };
    this.head = (this.head + 1) % MAX_LOG_ENTRIES;
    if (this.count < MAX_LOG_ENTRIES) this.count++;
  }

  info(source: string, message: string, details?: Record<string, unknown>) {
    this.push('info', source, message, details);
  }
  warn(source: string, message: string, details?: Record<string, unknown>) {
    this.push('warn', source, message, details);
  }
  error(source: string, message: string, details?: Record<string, unknown>) {
    this.push('error', source, message, details);
  }
  debug(source: string, message: string, details?: Record<string, unknown>) {
    this.push('debug', source, message, details);
  }

  get(limit = 100, level?: string, source?: string, query?: string, before?: string): LogEntry[] {
    let result: LogEntry[] = [];
    // Walk backwards from head to collect entries
    const start = this.count < MAX_LOG_ENTRIES ? 0 : this.head;
    const len = Math.min(this.count, limit);
    for (let i = 0; i < this.count && result.length < len; i++) {
      const idx = (this.head - 1 - i + MAX_LOG_ENTRIES) % MAX_LOG_ENTRIES;
      const e = this.entries[idx];
      if (!e) continue;
      if (before && e.timestamp >= before) continue;
      if (level && e.level !== level) continue;
      if (source && e.source !== source) continue;
      if (query && !e.message.toLowerCase().includes(query.toLowerCase())) continue;
      result.push(e);
    }
    return result;
  }

  clear() {
    this.entries.fill(null);
    this.head = 0;
    this.count = 0;
  }

  get total() { return this.count; }

  /** Return all error/warn entries for the errors tab */
  getErrors(): { errors: LogEntry[]; alerts: LogEntry[] } {
    const errors: LogEntry[] = [];
    const alerts: LogEntry[] = [];
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head - 1 - i + MAX_LOG_ENTRIES) % MAX_LOG_ENTRIES;
      const e = this.entries[idx];
      if (!e) continue;
      if (e.level === 'error') errors.push(e);
      else if (e.level === 'warn') alerts.push(e);
    }
    return { errors, alerts };
  }

  /** Get unique sources for the source filter dropdown */
  getSources(): string[] {
    const set = new Set<string>();
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head - 1 - i + MAX_LOG_ENTRIES) % MAX_LOG_ENTRIES;
      const e = this.entries[idx];
      if (e) set.add(e.source);
    }
    return Array.from(set).sort();
  }
}

export const logBuffer = new LogBuffer();

export function registerLogRoutes(app: VestaraApp) {
  // Rate-limiter: at most 1 info-level log per source per 500ms
  const rateLimitMap = new Map<string, number>();

  app.addHook('onResponse', async (request, reply) => {
    try {
      const method = request.method;
      const url = request.url;
      const status = reply.statusCode;
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      const source = 'api';

      // Rate-limit info logs: skip if same source logged within 500ms
      if (level === 'info') {
        const now = Date.now();
        const last = rateLimitMap.get(source);
        if (last && now - last < 500) return;
        rateLimitMap.set(source, now);
      }

      logBuffer.push(level, source, `${method} ${url} → ${status}`);

      // Broadcast error/warn entries via WebSocket for live tail
      if (level === 'error' || level === 'warn') {
        try {
          app.broadcast('log:entry', {
            level,
            source,
            message: `${method} ${url} → ${status}`,
            timestamp: new Date().toISOString(),
          });
        } catch { /* broadcast may not be decorated in tests */ }
      }
    } catch { /* hook must never throw */ }
  });

  app.get('/api/system/logs', async (request) => {
    const query = request.query as {
      limit?: string; level?: string; source?: string;
      q?: string; before?: string;
    };
    const limit = Math.min(parseInt(query.limit || '100') || 100, 500);
    const entries = logBuffer.get(limit, query.level, query.source, query.q, query.before);
    return { entries, total: logBuffer.total, sources: logBuffer.getSources() };
  });

  app.post('/api/system/logs/clear', async () => {
    logBuffer.clear();
    return { message: 'Logs cleared' };
  });

  app.get('/api/system/logs/export', async (request) => {
    const query = request.query as { format?: 'json' | 'text'; level?: string };
    const entries = logBuffer.get(500, query.level);
    const format = query.format || 'json';

    if (format === 'text') {
      const text = entries.map(e =>
        `[${e.timestamp}] [${e.level.toUpperCase()}] [${e.source}] ${e.message}`
      ).join('\n');
      return { format: 'text', content: text, filename: `vestara-logs-${Date.now()}.txt` };
    }
    return { format: 'json', content: entries, filename: `vestara-logs-${Date.now()}.json` };
  });

  app.get('/api/system/logs/sources', async () => {
    return { sources: logBuffer.getSources() };
  });

  app.get('/api/system/logs/os', async (request) => {
    const query = request.query as { lines?: string; priority?: string };
    const lines = parseInt(query.lines || '50') || 50;

    let entries: Array<{ timestamp: string; level: string; message: string }> = [];

    try {
      const priority = query.priority || 'info';
      const prioMap: Record<string, string> = {
        emerg: '0', alert: '1', crit: '2', err: '3',
        warning: '4', notice: '5', info: '6', debug: '7',
      };
      const prio = prioMap[priority] || '0..7';

      const { stdout } = await execAsync(
        `journalctl -n ${Math.min(lines, 200)} -o json --no-pager -p ${prio} 2>/dev/null || echo '[]'`,
        { shell: '/usr/bin/sh', timeout: 5000, maxBuffer: 1024 * 256 },
      );

      if (stdout && stdout.trim() !== '[]') {
        const lineArr = stdout.trim().split('\n').filter(Boolean);
        entries = lineArr.map((line) => {
          try {
            const parsed = JSON.parse(line);
            const prioNum = parseInt(parsed.PRIORITY || '6');
            const levelMap: Record<number, string> = {
              0: 'emerg', 1: 'alert', 2: 'crit', 3: 'err',
              4: 'warning', 5: 'notice', 6: 'info', 7: 'debug',
            };
            return {
              timestamp: parsed.__REALTIME_TIMESTAMP
                ? new Date(parseInt(parsed.__REALTIME_TIMESTAMP) / 1000).toISOString()
                : parsed._SOURCE_REALTIME_TIMESTAMP
                  ? new Date(parseInt(parsed._SOURCE_REALTIME_TIMESTAMP) / 1000).toISOString()
                  : new Date().toISOString(),
              level: levelMap[prioNum] || 'info',
              message: parsed.MESSAGE || parsed.SYSLOG_IDENTIFIER || '(empty)',
            };
          } catch {
            return null;
          }
        }).filter(Boolean) as Array<{ timestamp: string; level: string; message: string }>;
      }
    } catch {
      // journalctl not available or no permissions
      try {
        const syslog = '/var/log/syslog';
        if (existsSync(syslog)) {
          const content = readFileSync(syslog, 'utf-8').split('\n').filter(Boolean).slice(-lines);
          entries = content.map((line) => ({
            timestamp: line.substring(0, 15) || new Date().toISOString(),
            level: line.includes('error') || line.includes('Error') ? 'err' : 'info',
            message: line,
          }));
        }
      } catch {}
    }

    return { entries };
  });

  app.get('/api/system/logs/errors', async () => {
    const { errors, alerts } = logBuffer.getErrors();
    let osErrors: Array<{ timestamp: string; level: string; message: string }> = [];

    try {
      const { stdout } = await execAsync(
        `journalctl -n 50 -o json --no-pager -p err 2>/dev/null || echo '[]'`,
        { shell: '/usr/bin/sh', timeout: 5000, maxBuffer: 1024 * 64 },
      );

      if (stdout && stdout.trim() !== '[]') {
        osErrors = stdout.trim().split('\n').filter(Boolean).map((line) => {
          try {
            const parsed = JSON.parse(line);
            return {
              timestamp: parsed.__REALTIME_TIMESTAMP
                ? new Date(parseInt(parsed.__REALTIME_TIMESTAMP) / 1000).toISOString()
                : new Date().toISOString(),
              level: 'error' as const,
              message: parsed.MESSAGE || '(empty)',
            };
          } catch { return null; }
        }).filter(Boolean) as Array<{ timestamp: string; level: string; message: string }>;
      }
    } catch {}

    return { errors, osErrors, alerts };
  });
}
