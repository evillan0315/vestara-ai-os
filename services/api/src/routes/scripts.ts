import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { VestaraApp } from '../types.js';
import { authMiddleware } from './auth.js';

interface ScriptInfo {
  name: string;
  filename: string;
  description: string;
  usage: string;
  size: number;
  category: 'build' | 'deploy' | 'maintain';
  docs: {
    summary: string;
    description: string;
    prerequisites: string[];
    options: { flag: string; description: string }[];
    examples: string[];
    outputs: string[];
    notes: string[];
  };
}

const SCRIPTS_DIR = join(import.meta.dirname, '..', '..', '..', '..', 'scripts');

const SCRIPT_DOCS: Record<string, ScriptInfo['docs']> = {
  'build-ssd.sh': {
    summary: 'Build bootable SSD image for Vestara AI OS',
    description:
      'Creates a 20GB GPT disk image with three partitions (EFI, boot, root). ' +
      'Installs Debian 13 (Trixie) minimal via debootstrap, then layers on Node.js 22, ' +
      'Docker, Ollama, OpenCode, Chromium, and the full Vestara monorepo. ' +
      'Configures systemd auto-login for the `ai` user, installs Plymouth boot theme, ' +
      'and sets up systemd services. The resulting image can be flashed directly to an ' +
      'external SSD for portable booting on any x86-64 machine.',
    prerequisites: [
      'debootstrap',
      'parted',
      'mkfs.ext4',
      'mkfs.vfat',
      'chroot (from debootstrap)',
      'rsync',
      'fakeroot',
      '~20GB free disk space',
      'Root or loop device access (losetup)',
    ],
    options: [
      { flag: '--confirm', description: 'Required to run this script (safety gate)' },
    ],
    examples: [
      './scripts/build-ssd.sh',
    ],
    outputs: [
      'dist/vestara-ai-os.img — Raw disk image (20GB)',
    ],
    notes: [
      'Flash with: sudo dd if=dist/vestara-ai-os.img of=/dev/sdX bs=4M status=progress',
      'Requires sudo for losetup, mount, and debootstrap',
      'Build time: ~15-30 minutes depending on network speed',
      'All Vestara services are installed and enabled in the image',
    ],
  },

  'build-deb.sh': {
    summary: 'Build all Debian packages from the monorepo',
    description:
      'Produces five .deb packages from the built monorepo: vestara-core, vestara-api, ' +
      'vestara-dashboard, vestara-cli, and vestara-systemd. Each package includes proper ' +
      'control files, dependencies, systemd units, and post-install scripts. The dashboard ' +
      'package includes an Nginx config that proxies /api/ to localhost:3000.',
    prerequisites: [
      'dpkg-deb (from dpkg)',
      'fakeroot',
      'Built monorepo (run `pnpm build` first)',
    ],
    options: [
      { flag: 'VERSION=<semver>', description: 'Override version (default: 0.1.0)' },
    ],
    examples: [
      './scripts/build-deb.sh',
      'VERSION=0.2.0 ./scripts/build-deb.sh',
    ],
    outputs: [
      'dist/deb/vestara-core.deb — Core library (SQLite, memory, knowledge, agents)',
      'dist/deb/vestara-api.deb — Fastify API server',
      'dist/deb/vestara-dashboard.deb — React dashboard with Nginx config',
      'dist/deb/vestara-cli.deb — CLI tool (installs to /usr/bin/vestara)',
      'dist/deb/vestara-systemd.deb — systemd services and auto-login',
    ],
    notes: [
      'Run `pnpm build` before this script to ensure all packages are compiled',
      'All packages depend on Node.js >= 22',
      'vestara-dashboard depends on nginx and vestara-api',
      'vestara-api depends on vestara-core',
    ],
  },

  'build-repo.sh': {
    summary: 'Build a signed APT repository from .deb files',
    description:
      'Takes the .deb files from dist/deb/ and creates a proper APT repository structure ' +
      'with pool/main, Packages, Release, and GPG signatures. Auto-generates a GPG key ' +
      'if one doesn\'t exist. Produces both Release.gpg and InRelease (clear-signed) files ' +
      'for secure package installation.',
    prerequisites: [
      'dpkg-scanpackages (from dpkg-dev)',
      'gpg',
      'Built .deb files (run build-deb.sh first)',
    ],
    options: [
      { flag: 'GPG_KEY=<name>', description: 'GPG key identity (default: vestara)' },
    ],
    examples: [
      './scripts/build-repo.sh',
      'GPG_KEY=mykey ./scripts/build-repo.sh',
    ],
    outputs: [
      'dist/apt/pool/main/*.deb — Package pool',
      'dist/apt/dists/stable/main/binary-amd64/Packages — Package index',
      'dist/apt/dists/stable/Release — Release metadata with checksums',
      'dist/apt/dists/stable/Release.gpg — GPG-signed Release',
      'dist/apt/dists/stable/InRelease — Clear-signed Release',
      'dist/apt/key.gpg — Public GPG key',
    ],
    notes: [
      'Host the dist/apt/ directory on a web server for apt access',
      'Add to sources.list: deb [signed-by=key.gpg] https://repo.vestara.ai stable main',
      'The GPG key is generated automatically on first run',
    ],
  },

  'build-iso.sh': {
    summary: 'Build a bootable ISO image with Vestara pre-installed',
    description:
      'Creates a custom live ISO with Debian 13 minimal, Node.js 22, Docker, Ollama, ' +
      'Chromium, and the full Vestara stack. Includes isolinux (BIOS) and GRUB (UEFI) ' +
      'boot menus with normal, safe mode, and recovery entries. The live filesystem is ' +
      'compressed with squashfs for a compact image.',
    prerequisites: [
      'debootstrap',
      'xorriso',
      'mksquashfs (from squashfs-tools)',
      'grub-mkrescue (from grub2-common)',
      '~10GB free disk space',
    ],
    options: [
      { flag: 'VERSION=<semver>', description: 'Override ISO version (default: 0.1.0)' },
    ],
    examples: [
      './scripts/build-iso.sh',
      'VERSION=0.2.0 ./scripts/build-iso.sh',
    ],
    outputs: [
      'dist/iso/vestara-ai-os-<version>.iso — Bootable ISO image',
    ],
    notes: [
      'Default live user: ai / vestara',
      'Boot menu includes normal, safe mode (nomodeset), and recovery options',
      'ISO supports both legacy BIOS (isolinux) and UEFI (GRUB)',
      'Build time: ~20-40 minutes depending on network speed',
    ],
  },

  'install.sh': {
    summary: 'One-command installer for Vestara on Debian/Ubuntu',
    description:
      'Interactive installer that sets up Vestara AI OS on a Debian or Ubuntu system. ' +
      'Installs system dependencies, Node.js 22, Docker, Ollama, and all Vestara .deb ' +
      'packages from the Vestara APT repository. Creates the `ai` user with passwordless ' +
      'sudo, configures systemd services, and prints a post-install summary with quick ' +
      'start commands.',
    prerequisites: [
      'Debian 13+ or Ubuntu 22.04+',
      'x86_64 architecture',
      'Non-root user with sudo access',
      '8GB+ RAM recommended',
      'Internet connection',
    ],
    options: [
      { flag: 'VESTARA_USER=<user>', description: 'User to create (default: ai)' },
      { flag: 'API_PORT=<port>', description: 'API port (default: 3000)' },
      { flag: 'DASHBOARD_PORT=<port>', description: 'Dashboard port (default: 5173)' },
    ],
    examples: [
      'curl -fsSL https://get.vestara.ai | bash',
      'VESTARA_USER=myuser API_PORT=8080 bash scripts/install.sh',
    ],
    outputs: [
      'Vestara installed at /home/<user>/vestara/',
      'Services: vestara-api.service, vestara-dashboard.service',
      'Dashboard accessible at http://localhost:<DASHBOARD_PORT>',
    ],
    notes: [
      'Designed to be piped from curl (non-interactive friendly)',
      'Will NOT run as root (safety check)',
      'Detects existing installations and skips reinstalling dependencies',
      'Ollama starts on-demand when a local model is selected',
    ],
  },

  'upgrade.sh': {
    summary: 'Upgrade Vestara AI OS to the latest version',
    description:
      'Checks for available package updates, creates a pre-upgrade backup of the database ' +
      'and config, stops services, upgrades all Vestara packages via apt, restarts services, ' +
      'and verifies the API health check passes after upgrade.',
    prerequisites: [
      'Vestara installed via .deb packages',
      'Internet connection',
      'sudo access',
    ],
    options: [],
    examples: [
      './scripts/upgrade.sh',
    ],
    outputs: [
      'Updated Vestara packages',
      'Pre-upgrade backup at /home/ai/vestara-backups/vestara-pre-upgrade-*.tar.gz',
    ],
    notes: [
      'Automatically creates backup before upgrading',
      'Stops services during upgrade, restarts after',
      'Verifies API health with up to 10 retries',
      'If no updates are available, exits cleanly',
    ],
  },

  'deploy.sh': {
    summary: 'Deploy Vestara to a target system (CI/CD or manual)',
    description:
      'Deployment script used by GitHub Actions and manual deploys. Runs pre-deploy checks, ' +
      'creates a backup, installs production dependencies, builds if needed, runs migrations, ' +
      'restarts services, and performs a health check. In development mode, starts dev servers. ' +
      'In production mode, restarts systemd services.',
    prerequisites: [
      'Vestara codebase at DEPLOY_PATH',
      'pnpm installed',
      'sudo access (for systemd restarts in production)',
    ],
    options: [
      { flag: 'DEPLOY_ENV=<env>', description: 'Environment: development or production (default: development)' },
      { flag: 'DEPLOY_PATH=<path>', description: 'Path to Vestara installation (default: /opt/vestara)' },
    ],
    examples: [
      './scripts/deploy.sh deploy',
      'DEPLOY_ENV=production ./scripts/deploy.sh deploy',
      './scripts/deploy.sh health-check',
      './scripts/deploy.sh rollback',
    ],
    outputs: [
      'Vestara services running and healthy',
    ],
    notes: [
      'Used by GitHub Actions CD workflows',
      'Health check retries up to 10 times with 5s delay',
      'Rollback delegates to upgrade.sh rollback',
      'In dev mode, starts pnpm dev in the background',
    ],
  },

  'backup.sh': {
    summary: 'Backup and restore Vestara data, config, and knowledge base',
    description:
      'Full backup solution for Vestara user data. Backs up the SQLite database, configuration, ' +
      'knowledge base, memory, and projects directories. Creates a compressed tar.gz archive ' +
      'with a timestamped name. Supports listing available backups and restoring from any ' +
      'backup archive. Automatically cleans up backups older than RETENTION_DAYS.',
    prerequisites: [
      'rsync',
      'tar',
      'gzip',
    ],
    options: [
      { flag: 'backup', description: 'Create a new backup (default command)' },
      { flag: 'restore <file>', description: 'Restore from a specific backup archive' },
      { flag: 'list', description: 'List all available backups' },
      { flag: 'VESTARA_HOME=<path>', description: 'Vestara data directory (default: /home/ai/vestara)' },
      { flag: 'BACKUP_DIR=<path>', description: 'Backup output directory (default: ~/vestara-backups)' },
      { flag: 'RETENTION_DAYS=<days>', description: 'Days to keep backups (default: 30)' },
    ],
    examples: [
      './scripts/backup.sh backup',
      './scripts/backup.sh list',
      './scripts/backup.sh restore ~/vestara-backups/vestara-backup-20260720-120000.tar.gz',
      'RETENTION_DAYS=7 ./scripts/backup.sh backup',
    ],
    outputs: [
      'BACKUP_DIR/vestara-backup-YYYYMMDD-HHMMSS.tar.gz — Compressed backup archive',
    ],
    notes: [
      'Backup includes: database, config, knowledge, memory, projects',
      'Old backups are automatically cleaned up based on RETENTION_DAYS',
      'Restore overwrites existing files in the Vestara home directory',
      'Archive is cleaned up after compression (only .tar.gz is kept)',
    ],
  },
};

function getScriptInfo(filename: string): ScriptInfo {
  const filePath = join(SCRIPTS_DIR, filename);
  let size = 0;
  try {
    const stat = statSync(filePath);
    size = stat.size;
  } catch {}

  const categoryMap: Record<string, ScriptInfo['category']> = {
    'build-ssd.sh': 'build',
    'build-deb.sh': 'build',
    'build-repo.sh': 'build',
    'build-iso.sh': 'build',
    'install.sh': 'deploy',
    'deploy.sh': 'deploy',
    'upgrade.sh': 'maintain',
    'backup.sh': 'maintain',
  };

  const docs = SCRIPT_DOCS[filename] || {
    summary: 'Vestara script',
    description: '',
    prerequisites: [],
    options: [],
    examples: [],
    outputs: [],
    notes: [],
  };

  return {
    name: filename.replace('.sh', ''),
    filename,
    description: docs.summary,
    usage: docs.examples[0] || `./scripts/${filename}`,
    size,
    category: categoryMap[filename] || 'maintain',
    docs,
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
   * Get script details with full documentation
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
