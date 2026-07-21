import type { VestaraApp } from '../types.js';
import { authMiddleware } from './auth.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export function registerSettingsRoutes(app: VestaraApp) {
  // GET all settings
  app.get('/api/settings', {
    preHandler: [authMiddleware],
  }, async () => {
    const settings = app.settingsService.getAll();
    return { settings };
  });

  // GET single setting
  app.get<{
    Params: { key: string };
  }>('/api/settings/:key', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const value = app.settingsService.get(request.params.key);
    if (value === null) {
      return reply.status(404).send({ error: 'Setting not found' });
    }
    return { key: request.params.key, value };
  });

  // PUT single setting
  app.put<{
    Params: { key: string };
    Body: { value: string };
  }>('/api/settings/:key', {
    preHandler: [authMiddleware],
  }, async (request) => {
    app.settingsService.set(request.params.key, request.body.value);
    return { key: request.params.key, value: request.body.value };
  });

  // PUT bulk settings
  app.put<{
    Body: Record<string, string>;
  }>('/api/settings', {
    preHandler: [authMiddleware],
  }, async (request) => {
    app.settingsService.setMany(request.body);
    return { settings: app.settingsService.getAll() };
  });

  // Backup
  app.post('/api/settings/backup', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const date = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `/tmp/vestara-backup-${date}.json`;
      const settings = app.settingsService.getAll();
      const { writeFileSync } = await import('node:fs');
      writeFileSync(backupPath, JSON.stringify({ settings, timestamp: date }, null, 2));
      return reply.send({ path: backupPath, size: settings.length });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Reset all settings
  app.post('/api/settings/reset', {
    preHandler: [authMiddleware],
  }, async () => {
    app.settingsService.clear();
    return { message: 'Settings reset to defaults' };
  });
}
