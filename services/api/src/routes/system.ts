import type { VestaraApp } from '../types.js';
import { cpus, totalmem, freemem, loadavg, hostname, networkInterfaces } from 'node:os';
import { exec, execSync } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export function registerSystemRoutes(app: VestaraApp) {
  app.get('/api/system/stats', async () => {
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
        temperature: 0,
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usage: Math.round((usedMem / totalMem) * 100),
      },
      disk: {
        ...diskInfo,
        usage: diskInfo.total > 0 ? Math.round((diskInfo.used / diskInfo.total) * 100) : 0,
      },
      uptime: process.uptime(),
      loadAvg: loadavg(),
      processes: 0,
    };
  });

  app.get('/api/system/health', async () => {
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

  app.get('/api/system/info', async () => {
    const cpuInfo = cpus();
    const totalMem = totalmem();
    const freeMem = freemem();
    const usedMem = totalMem - freeMem;

    const cpuUsage = cpuInfo.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total);
    }, 0) / cpuInfo.length;

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

    let processes = 0;
    try {
      const ps = execSync('ps -e --no-headers | wc -l').toString().trim();
      processes = parseInt(ps) || 0;
    } catch {
      // Ignore
    }

    const ifaces = networkInterfaces();
    const networkInterfacesList = Object.entries(ifaces).flatMap(([name, addrs]) =>
      (addrs || [])
        .filter((addr) => !addr.internal)
        .map((addr) => ({
          name,
          ip: addr.address,
          family: addr.family,
          rx: 0,
          tx: 0,
        }))
    );

    return {
      cpu: {
        model: cpuInfo[0]?.model || 'Unknown',
        cores: cpuInfo.length,
        usage: Math.round(cpuUsage * 100),
        temperature: 0,
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usage: Math.round((usedMem / totalMem) * 100),
      },
      disk: {
        ...diskInfo,
        usage: diskInfo.total > 0 ? Math.round((diskInfo.used / diskInfo.total) * 100) : 0,
      },
      network: {
        interfaces: networkInterfacesList,
      },
      uptime: process.uptime(),
      loadAvg: loadavg(),
      processes,
      hostname: hostname(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
    };
  });

  app.post<{
    Body: { command: string };
  }>('/api/system/exec', async (request, reply) => {
    const { command } = request.body;

    if (!command || typeof command !== 'string') {
      return reply.status(400).send({ error: 'command is required' });
    }

    // Block dangerous commands
    const blocked = ['rm -rf /', 'mkfs', ':(){', 'dd if=/dev/zero'];
    if (blocked.some((b) => command.includes(b))) {
      return reply.status(403).send({ error: 'Command blocked for safety' });
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, TERM: 'dumb' },
      });
      return reply.send({
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: 0,
      });
    } catch (err: any) {
      return reply.send({
        stdout: err.stdout || '',
        stderr: err.stderr || err.message || 'Command failed',
        exitCode: err.code || 1,
      });
    }
  });
}
