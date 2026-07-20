import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, rmSync, renameSync, existsSync } from 'node:fs';
import { join, basename, dirname, extname, resolve, relative } from 'node:path';
import { execSync } from 'node:child_process';
import type { VestaraApp } from '../types.js';
import { authMiddleware } from './auth.js';

const HOME_DIR = process.env.HOME || '/home/ai';
const ROOT_DIR = process.env.VESTARA_FILES_ROOT || HOME_DIR;

function safePath(requested: string): string | null {
  const resolved = resolve(ROOT_DIR, requested);
  if (!resolved.startsWith(ROOT_DIR)) return null;
  return resolved;
}

function getFileIcon(name: string, isDir: boolean): string {
  if (isDir) return '📁';
  const ext = extname(name).toLowerCase();
  const icons: Record<string, string> = {
    '.ts': '🟦', '.tsx': '🟦', '.js': '🟨', '.jsx': '🟨',
    '.json': '📋', '.md': '📝', '.txt': '📄', '.sh': '📜',
    '.py': '🐍', '.rs': '🦀', '.go': '🐹', '.rb': '💎',
    '.html': '🌐', '.css': '🎨', '.scss': '🎨',
    '.yaml': '⚙️', '.yml': '⚙️', '.toml': '⚙️',
    '.env': '🔒', '.key': '🔑', '.pem': '🔑',
    '.png': '🖼️', '.jpg': '🖼️', '.jpeg': '🖼️', '.gif': '🖼️', '.svg': '🖼️',
    '.mp3': '🎵', '.mp4': '🎬', '.zip': '📦', '.tar': '📦', '.gz': '📦',
    '.db': '🗃️', '.sqlite': '🗃️',
  };
  return icons[ext] || '📄';
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size: number;
  sizeFormatted: string;
  modified: string;
  permissions: string;
  icon: string;
  extension: string;
}

function listDir(dirPath: string): FileEntry[] {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  return entries
    .filter((e) => !e.name.startsWith('.'))
    .map((entry) => {
      const fullPath = join(dirPath, entry.name);
      const relPath = relative(ROOT_DIR, fullPath);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        return null;
      }
      const isDir = entry.isDirectory();
      return {
        name: entry.name,
        path: relPath,
        type: isDir ? 'directory' : entry.isSymbolicLink() ? 'symlink' : 'file',
        size: isDir ? 0 : stat.size,
        sizeFormatted: isDir ? '-' : formatSize(stat.size),
        modified: stat.mtime.toISOString(),
        permissions: (stat.mode & 0o777).toString(8),
        icon: getFileIcon(entry.name, isDir),
        extension: isDir ? '' : extname(entry.name).toLowerCase(),
      };
    })
    .filter(Boolean) as FileEntry[];
}

export function registerFileRoutes(app: VestaraApp) {
  /**
   * List directory contents
   */
  app.get<{
    Querystring: { path?: string };
  }>('/api/files/list', { preHandler: [authMiddleware] }, async (request, reply) => {
    const reqPath = request.query.path || '';
    const fullPath = safePath(reqPath);
    if (!fullPath) return reply.status(403).send({ error: 'Access denied' });
    if (!existsSync(fullPath)) return reply.status(404).send({ error: 'Directory not found' });

    const stat = statSync(fullPath);
    if (!stat.isDirectory()) return reply.status(400).send({ error: 'Not a directory' });

    try {
      const entries = listDir(fullPath);
      const relativePath = relative(ROOT_DIR, fullPath);
      return {
        path: relativePath || '.',
        parent: relativePath ? dirname(relativePath) : null,
        entries,
        total: entries.length,
      };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return reply.status(500).send({ error: e.message || 'Failed to list directory' });
    }
  });

  /**
   * Read file content
   */
  app.get<{
    Querystring: { path?: string };
  }>('/api/files/read', { preHandler: [authMiddleware] }, async (request, reply) => {
    const reqPath = request.query.path || '';
    const fullPath = safePath(reqPath);
    if (!fullPath) return reply.status(403).send({ error: 'Access denied' });
    if (!existsSync(fullPath)) return reply.status(404).send({ error: 'File not found' });

    const stat = statSync(fullPath);
    if (stat.isDirectory()) return reply.status(400).send({ error: 'Cannot read a directory' });
    if (stat.size > 5 * 1024 * 1024) return reply.status(400).send({ error: 'File too large (>5MB)' });

    try {
      const content = readFileSync(fullPath, 'utf-8');
      const ext = extname(fullPath).toLowerCase();
      const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.mp3', '.mp4', '.zip', '.tar', '.gz', '.db', '.sqlite'];
      const isBinary = binaryExts.includes(ext);

      return {
        path: relative(ROOT_DIR, fullPath),
        content: isBinary ? null : content,
        size: stat.size,
        sizeFormatted: formatSize(stat.size),
        modified: stat.mtime.toISOString(),
        extension: ext,
        isBinary,
        lineCount: isBinary ? 0 : content.split('\n').length,
      };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return reply.status(500).send({ error: e.message || 'Failed to read file' });
    }
  });

  /**
   * Write/create file
   */
  app.post<{
    Body: { path: string; content: string };
  }>('/api/files/write', { preHandler: [authMiddleware] }, async (request, reply) => {
    const { path: reqPath, content } = request.body;
    if (!reqPath || content === undefined) {
      return reply.status(400).send({ error: 'path and content are required' });
    }

    const fullPath = safePath(reqPath);
    if (!fullPath) return reply.status(403).send({ error: 'Access denied' });

    try {
      const dir = dirname(fullPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(fullPath, content, 'utf-8');
      return { success: true, path: relative(ROOT_DIR, fullPath) };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return reply.status(500).send({ error: e.message || 'Failed to write file' });
    }
  });

  /**
   * Create directory
   */
  app.post<{
    Body: { path: string };
  }>('/api/files/mkdir', { preHandler: [authMiddleware] }, async (request, reply) => {
    const { path: reqPath } = request.body;
    if (!reqPath) return reply.status(400).send({ error: 'path is required' });

    const fullPath = safePath(reqPath);
    if (!fullPath) return reply.status(403).send({ error: 'Access denied' });

    try {
      mkdirSync(fullPath, { recursive: true });
      return { success: true, path: relative(ROOT_DIR, fullPath) };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return reply.status(500).send({ error: e.message || 'Failed to create directory' });
    }
  });

  /**
   * Delete file or directory
   */
  app.post<{
    Body: { path: string };
  }>('/api/files/delete', { preHandler: [authMiddleware] }, async (request, reply) => {
    const { path: reqPath } = request.body;
    if (!reqPath) return reply.status(400).send({ error: 'path is required' });

    const fullPath = safePath(reqPath);
    if (!fullPath) return reply.status(403).send({ error: 'Access denied' });
    if (!existsSync(fullPath)) return reply.status(404).send({ error: 'Not found' });

    try {
      rmSync(fullPath, { recursive: true, force: true });
      return { success: true, path: relative(ROOT_DIR, fullPath) };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return reply.status(500).send({ error: e.message || 'Failed to delete' });
    }
  });

  /**
   * Rename/move file
   */
  app.post<{
    Body: { from: string; to: string };
  }>('/api/files/rename', { preHandler: [authMiddleware] }, async (request, reply) => {
    const { from, to } = request.body;
    if (!from || !to) return reply.status(400).send({ error: 'from and to are required' });

    const fullFrom = safePath(from);
    const fullTo = safePath(to);
    if (!fullFrom || !fullTo) return reply.status(403).send({ error: 'Access denied' });
    if (!existsSync(fullFrom)) return reply.status(404).send({ error: 'Source not found' });
    if (existsSync(fullTo)) return reply.status(409).send({ error: 'Destination already exists' });

    try {
      renameSync(fullFrom, fullTo);
      return { success: true, from: relative(ROOT_DIR, fullFrom), to: relative(ROOT_DIR, fullTo) };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return reply.status(500).send({ error: e.message || 'Failed to rename' });
    }
  });

  /**
   * Get directory tree (for sidebar)
   */
  app.get<{
    Querystring: { path?: string; depth?: string };
  }>('/api/files/tree', { preHandler: [authMiddleware] }, async (request, reply) => {
    const reqPath = request.query.path || '';
    const maxDepth = parseInt(request.query.depth || '2', 10);
    const fullPath = safePath(reqPath);
    if (!fullPath) return reply.status(403).send({ error: 'Access denied' });

    function buildTree(dirPath: string, depth: number): FileEntry[] {
      if (depth > maxDepth) return [];
      try {
        const entries = readdirSync(dirPath, { withFileTypes: true });
        return entries
          .filter((e) => !e.name.startsWith('.') && e.isDirectory())
          .map((entry) => {
            const childPath = join(dirPath, entry.name);
            return {
              name: entry.name,
              path: relative(ROOT_DIR, childPath),
              type: 'directory' as const,
              size: 0,
              sizeFormatted: '-',
              modified: '',
              permissions: '',
              icon: '📁',
              extension: '',
              children: buildTree(childPath, depth + 1),
            };
          });
      } catch {
        return [];
      }
    }

    const tree = buildTree(fullPath, 0);
    return { path: relative(ROOT_DIR, fullPath) || '.', tree };
  });

  /**
   * Search files by name
   */
  app.get<{
    Querystring: { path?: string; query?: string };
  }>('/api/files/search', { preHandler: [authMiddleware] }, async (request, reply) => {
    const reqPath = request.query.path || '';
    const query = request.query.query || '';
    if (!query) return reply.status(400).send({ error: 'query is required' });

    const fullPath = safePath(reqPath);
    if (!fullPath) return reply.status(403).send({ error: 'Access denied' });

    try {
      const result = execSync(
        `find "${fullPath}" -maxdepth 5 -name "*${query.replace(/"/g, '\\"')}*" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -50`,
        { encoding: 'utf-8', timeout: 10000, shell: '/usr/bin/sh' }
      );

      const results = result.trim().split('\n').filter(Boolean).map((line) => {
        const stat = statSync(line);
        const name = basename(line);
        return {
          name,
          path: relative(ROOT_DIR, line),
          type: stat.isDirectory() ? 'directory' as const : 'file' as const,
          size: stat.size,
          sizeFormatted: formatSize(stat.size),
          modified: stat.mtime.toISOString(),
          permissions: (stat.mode & 0o777).toString(8),
          icon: getFileIcon(name, stat.isDirectory()),
          extension: stat.isDirectory() ? '' : extname(name).toLowerCase(),
        };
      });

      return { results, total: results.length };
    } catch {
      return { results: [], total: 0 };
    }
  });
}
