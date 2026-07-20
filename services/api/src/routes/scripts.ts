import { execSync, spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { VestaraApp } from '../types.js';
import { authMiddleware } from './auth.js';

interface ScriptInfo {
  name: string;
  filename: string;
  description: string;
  usage: string;
  size: number;
}

const SCRIPTS_DIR = join(process.cwd(), 'scripts');

const SCRIPT_DOCS: Record<string, { description: string; usage: string }> = {
  'build-ssd.sh': {
    description: 'Build bootable SSD image for Vestara AI OS',
    usage: './scripts/build-ssd.sh [--dist <dir>] [--work <dir>]',
  },
  'build-deb.sh': {
    description: 'Build Debian packages for all Vestara components',
    usage: './scripts/build-deb.sh [--output <dir>]',
  },
  'build-repo.sh': {
    description: 'Build APT repository for Vestara packages',
    usage: './scripts/build-repo.sh [--input <dir>] [--output <dir>]',
  },
  'build-iso.sh': {
    description: 'Build custom ISO image with Vestara pre-installed',
    usage: './scripts/build-iso.sh [--output <dir>]',
  },
  'install.sh': {
    description: 'One-command installer for Vestara AI OS',
    usage: 'curl -fsSL <url> | sudo bash',
  },
  'upgrade.sh': {
    description: 'Upgrade Vestara AI OS to latest version',
    usage: './scripts/upgrade.sh [--version <ver>]',
  },
  'deploy.sh': {
    description: 'Deploy Vestara services to target system',
    usage: './scripts/deploy.sh [--target <host>] [--env <env>]',
  },
  'backup.sh': {
    description: 'Backup and restore Vestara data and configuration',
    usage: './scripts/backup.sh <backup|restore|list> [--file <path>]',
  },
};

function getScriptInfo(filename: string): ScriptInfo {
  const filePath = join(SCRIPTS_DIR, filename);
  const stat = { size: 0 };
  try {
    const { statSync } = require('node:fs');
    const s = statSync(filePath);
    stat.size = s.size;
  } catch {}

  const doc = SCRIPT_DOCS[filename] || {
    description: 'Vestara script',
    usage: `./scripts/${filename}`,
  };

  return {
    name: filename.replace('.sh', ''),
    filename,
    description: doc.description,
    usage: doc.usage,
    size: stat.size,
  };
}

export function registerScriptRoutes(app: VestaraApp) {
  /**
   * List all available scripts
   */
  app.get('/api/scripts', { preHandler: [authMiddleware] }, async () => {
    const files = readdirSync(SCRIPTS_DIR).filter((f) => f.endsWith('.sh'));
    const scripts = files.map(getScriptInfo);
    return { scripts };
  });

  /**
   * Get script details
   */
  app.get<{
    Params: { name: string };
  }>('/api/scripts/:name', { preHandler: [authMiddleware] }, async (request, reply) => {
    const { name } = request.params;
    const filename = name.endsWith('.sh') ? name : `${name}.sh`;
    const filePath = join(SCRIPTS_DIR, filename);

    if (!existsSync(filePath)) {
      return reply.status(404).send({ error: 'Script not found' });
    }

    let content = '';
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {}

    const info = getScriptInfo(filename);
    return { ...info, content };
  });

  /**
   * Execute a script
   */
  app.post<{
    Params: { name: string };
    Body: { args?: string[]; env?: Record<string, string> };
  }>('/api/scripts/:name/run', { preHandler: [authMiddleware] }, async (request, reply) => {
    const { name } = request.params;
    const { args = [], env = {} } = request.body || {};
    const filename = name.endsWith('.sh') ? name : `${name}.sh`;
    const filePath = join(SCRIPTS_DIR, filename);

    if (!existsSync(filePath)) {
      return reply.status(404).send({ error: 'Script not found' });
    }

    // Block dangerous scripts without confirmation
    const dangerous = ['build-ssd.sh', 'install.sh'];
    if (dangerous.includes(filename) && !args.includes('--confirm')) {
      return reply.status(400).send({
        error: `This script requires confirmation. Add --confirm to args.`,
      });
    }

    const command = `bash ${filePath} ${args.join(' ')}`;

    try {
      const stdout = execSync(command, {
        cwd: SCRIPTS_DIR,
        timeout: 300000,
        env: {
          ...process.env,
          ...env,
          CI: 'true',
          DEBIAN_FRONTEND: 'noninteractive',
        },
        shell: '/usr/bin/sh',
      });

      return {
        stdout: String(stdout || ''),
        stderr: '',
        exitCode: 0,
      };
    } catch (err: unknown) {
      const e = err as { stdout?: unknown; stderr?: unknown; status?: number; message?: string };
      return {
        stdout: String(e.stdout || ''),
        stderr: String(e.stderr || e.message || ''),
        exitCode: e.status || 1,
      };
    }
  });

  /**
   * Execute a script with streaming output
   */
  app.post<{
    Params: { name: string };
    Body: { args?: string[] };
  }>('/api/scripts/:name/stream', { preHandler: [authMiddleware] }, async (request, reply) => {
    const { name } = request.params;
    const { args = [] } = request.body || {};
    const filename = name.endsWith('.sh') ? name : `${name}.sh`;
    const filePath = join(SCRIPTS_DIR, filename);

    if (!existsSync(filePath)) {
      return reply.status(404).send({ error: 'Script not found' });
    }

    const command = `bash ${filePath} ${args.join(' ')}`;

    try {
      const stdout = execSync(command, {
        cwd: SCRIPTS_DIR,
        timeout: 300000,
        env: {
          ...process.env,
          CI: 'true',
          DEBIAN_FRONTEND: 'noninteractive',
        },
        shell: '/usr/bin/sh',
      });

      return {
        output: String(stdout || ''),
        exitCode: 0,
      };
    } catch (err: unknown) {
      const e = err as { stdout?: unknown; stderr?: unknown; status?: number; message?: string };
      return {
        output: String(e.stdout || '') + String(e.stderr || e.message || ''),
        exitCode: e.status || 1,
      };
    }
  });
}
