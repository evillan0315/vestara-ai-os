import type { VestaraApp } from '../types.js';
import { authMiddleware } from './auth.js';
import { cpus, totalmem, freemem } from 'node:os';
import { execSync } from 'node:child_process';

export function registerSystemRoutes(app: VestaraApp) {
  app.get('/api/system/stats', {
    preHandler: [authMiddleware],
  }, async () => {
    const cpuInfo = cpus();
    const cpuUsage = cpuInfo.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total);
    }, 0) / cpuInfo.length;

    const totalMem = totalmem();
    const freeMem = freemem();
    const usedMem = totalMem - freeMem;

    let diskInfo = { total: 0, used: 0, free: 0 };
    try {
      const df = execSync('df -B1 / | tail -1').toString().trim().split(/\s+/);
      diskInfo = {
        total: parseInt(df[1]) || 0,
        used: parseInt(df[2]) || 0,
        free: parseInt(df[3]) || 0,
      };
    } catch {
      // Ignore
    }

    return {
      cpu: {
        usage: Math.round(cpuUsage * 100),
        cores: cpuInfo.length,
        model: cpuInfo[0]?.model || 'Unknown',
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        vestara: 0, // TODO: Track actual Vestara memory usage
      },
      disk: diskInfo,
    };
  });

  app.get('/api/system/health', {
    preHandler: [authMiddleware],
  }, async () => {
    const services: Record<string, 'ok' | 'error' | 'stopped'> = {
      core: 'ok',
      api: 'ok',
      database: 'ok',
    };

    return {
      status: 'ok',
      uptime: process.uptime(),
      version: '0.1.0',
      services,
    };
  });

  app.get('/api/system/info', {
    preHandler: [authMiddleware],
  }, async () => {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      hostname: require('os').hostname(),
      uptime: process.uptime(),
    };
  });
}
