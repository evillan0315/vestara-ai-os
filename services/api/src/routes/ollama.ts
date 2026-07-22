import { execSync, spawn, type ChildProcess } from 'node:child_process';
import type { VestaraApp } from '../types.js';
import { authMiddleware } from './auth.js';

let ollamaProcess: ChildProcess | null = null;

function ollamaFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`http://localhost:11434${path}`, options);
}

export function registerOllamaRoutes(app: VestaraApp) {
  /**
   * Get Ollama status — running, models, RAM usage
   */
  app.get('/api/ollama/status', { preHandler: [authMiddleware] }, async () => {
    try {
      const tagsRes = await ollamaFetch('/api/tags');
      if (!tagsRes.ok) return { running: false, models: [], ramUsed: 0, ramTotal: 0 };

      const tags = await tagsRes.json() as { models?: { name: string; size: number; modified_at: string }[] };
      const models = (tags.models || []).map((m) => ({
        name: m.name,
        size: m.size,
        modified: m.modified_at,
      }));

      let ramUsed = 0;
      let ramTotal = 0;
      try {
        const memRes = await ollamaFetch('/api/ps');
        if (memRes.ok) {
          const ps = await memRes.json() as { models?: { size: number }[] };
          ramUsed = (ps.models || []).reduce((sum, m) => sum + (m.size || 0), 0);
        }
      } catch {}

      try {
        const totalMem = parseInt(execSync("grep MemTotal /proc/meminfo | awk '{print $2}'", { stdio: 'pipe' }).toString().trim());
        ramTotal = totalMem * 1024; // kB to bytes
      } catch {}

      return { running: true, models, ramUsed, ramTotal };
    } catch {
      return { running: false, models: [], ramUsed: 0, ramTotal: 0 };
    }
  });

  /**
   * Pull a model
   */
  app.post('/api/ollama/pull', { preHandler: [authMiddleware] }, async (request, reply) => {
    const { model } = request.body as { model?: string };
    if (!model) return reply.status(400).send({ error: 'Model name required' });

    // Ollama pull is async — we fire-and-forget it
    try {
      const res = await ollamaFetch('/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model, stream: false }),
      });
      if (!res.ok) return reply.status(500).send({ error: 'Failed to pull model' });
      return { status: 'pulling', model };
    } catch (e) {
      return reply.status(500).send({ error: e instanceof Error ? e.message : 'Pull failed' });
    }
  });

  /**
   * Delete a local model
   */
  app.post('/api/ollama/delete', { preHandler: [authMiddleware] }, async (request, reply) => {
    const { model } = request.body as { model?: string };
    if (!model) return reply.status(400).send({ error: 'Model name required' });

    try {
      const res = await fetch('http://localhost:11434/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model }),
      });
      if (!res.ok) return reply.status(500).send({ error: 'Failed to delete model' });
      return { status: 'deleted', model };
    } catch (e) {
      return reply.status(500).send({ error: e instanceof Error ? e.message : 'Delete failed' });
    }
  });

  /**
   * Start Ollama server
   */
  app.post('/api/ollama/start', { preHandler: [authMiddleware] }, async () => {
    if (ollamaProcess) return { status: 'already-running' };

    try {
      ollamaProcess = spawn('ollama', ['serve'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
      });
      ollamaProcess.unref();
      ollamaProcess.on('exit', () => { ollamaProcess = null; });
      return { status: 'started' };
    } catch (e) {
      return { status: 'error', error: e instanceof Error ? e.message : 'Failed to start' };
    }
  });

  /**
   * Stop Ollama server
   */
  app.post('/api/ollama/stop', { preHandler: [authMiddleware] }, async () => {
    try {
      execSync('pkill -f "ollama serve"', { stdio: 'pipe' });
      ollamaProcess = null;
      return { status: 'stopped' };
    } catch {
      return { status: 'not-running' };
    }
  });
}
