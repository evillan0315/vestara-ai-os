import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { VestaraApp } from '../types.js';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
  details?: Record<string, unknown>;
}

const MAX_LOG_ENTRIES = 2000;

class LogBuffer {
  private entries: LogEntry[] = [];

  push(level: LogEntry['level'], source: string, message: string, details?: Record<string, unknown>) {
    this.entries.push({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      details,
    });
    if (this.entries.length > MAX_LOG_ENTRIES) {
      this.entries = this.entries.slice(-MAX_LOG_ENTRIES);
    }
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

  get(limit = 100, level?: string, source?: string): LogEntry[] {
    let result = this.entries;
    if (level) result = result.filter(e => e.level === level);
    if (source) result = result.filter(e => e.source === source);
    return result.slice(-limit).reverse();
  }

  clear() {
    this.entries = [];
  }

  getAll(): LogEntry[] {
    return [...this.entries];
  }
}

export const logBuffer = new LogBuffer();

export function registerLogRoutes(app: VestaraApp) {
  app.addHook('onResponse', async (_request, reply) => {
    try {
      const method = _request.method;
      const url = _request.url;
      const status = reply.statusCode;
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      logBuffer.push(level, 'api', `${method} ${url} → ${status}`);
    } catch { /* hook must never throw */ }
  });

  app.get('/api/system/logs', async (request) => {
    const query = request.query as { limit?: string; level?: string; source?: string };
    const limit = Math.min(parseInt(query.limit || '100') || 100, 500);
    const entries = logBuffer.get(limit, query.level, query.source);
    return { entries, total: logBuffer.getAll().length };
  });

  app.post('/api/system/logs/clear', async () => {
    logBuffer.clear();
    return { message: 'Logs cleared' };
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

      const out = execSync(
        `journalctl -n ${Math.min(lines, 200)} -o json --no-pager -p ${prio} 2>/dev/null || echo '[]'`,
        { shell: '/usr/bin/sh', timeout: 5000, maxBuffer: 1024 * 256 },
      ).toString().trim();

      if (out && out !== '[]') {
        const lines = out.split('\n').filter(Boolean);
        entries = lines.map((line) => {
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
    const appErrors = logBuffer.get(100, 'error');
    let osErrors: Array<{ timestamp: string; level: string; message: string }> = [];

    try {
      const out = execSync(
        `journalctl -n 50 -o json --no-pager -p err 2>/dev/null || echo '[]'`,
        { shell: '/usr/bin/sh', timeout: 5000, maxBuffer: 1024 * 64 },
      ).toString().trim();

      if (out && out !== '[]') {
        osErrors = out.split('\n').filter(Boolean).map((line) => {
          try {
            const parsed = JSON.parse(line);
            return {
              timestamp: parsed.__REALTIME_TIMESTAMP
                ? new Date(parseInt(parsed.__REALTIME_TIMESTAMP) / 1000).toISOString()
                : new Date().toISOString(),
              level: 'error',
              message: parsed.MESSAGE || '(empty)',
            };
          } catch { return null; }
        }).filter(Boolean) as Array<{ timestamp: string; level: string; message: string }>;
      }
    } catch {}

    const alerts = logBuffer.get(50, 'warn');

    return { errors: appErrors, osErrors, alerts };
  });
}
