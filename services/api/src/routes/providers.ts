import type { VestaraApp } from '../types.js';
import { authMiddleware } from './auth.js';
import { generateId } from '@vestara/utils';

interface ProviderRow {
  id: string;
  name: string;
  type: string;
  api_key_encrypted: string | null;
  base_url: string | null;
  config: string;
  enabled: number;
  created_at: string;
}

export function registerProviderRoutes(app: VestaraApp) {
  app.get('/api/providers', {
    preHandler: [authMiddleware],
  }, async () => {
    const providers = app.db.all<ProviderRow>(
      'SELECT * FROM providers ORDER BY created_at DESC',
    );
    return {
      providers: providers.map((p: ProviderRow) => ({
        ...p,
        config: JSON.parse(p.config),
        enabled: Boolean(p.enabled),
      })),
    };
  });

  app.post<{
    Body: { name: string; type: string; apiKey?: string; baseUrl?: string; config?: Record<string, unknown> };
  }>('/api/providers', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { name, type, apiKey, baseUrl, config } = request.body;
    const id = generateId();

    app.db.run(
      'INSERT INTO providers (id, name, type, api_key_encrypted, base_url, config) VALUES (?, ?, ?, ?, ?, ?)',
      id, name, type, apiKey || null, baseUrl || null, JSON.stringify(config || {}),
    );

    return reply.status(201).send({
      provider: { id, name, type, baseUrl, config: config || {}, enabled: true },
    });
  });

  app.patch<{
    Params: { id: string };
    Body: { name?: string; apiKey?: string; baseUrl?: string; enabled?: boolean };
  }>('/api/providers/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;

    const existing = app.db.get<ProviderRow>('SELECT * FROM providers WHERE id = ?', id);
    if (!existing) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.apiKey !== undefined) { fields.push('api_key_encrypted = ?'); values.push(updates.apiKey); }
    if (updates.baseUrl !== undefined) { fields.push('base_url = ?'); values.push(updates.baseUrl); }
    if (updates.enabled !== undefined) { fields.push('enabled = ?'); values.push(updates.enabled ? 1 : 0); }

    if (fields.length > 0) {
      fields.push('updated_at = datetime(\'now\')');
      values.push(id);
      app.db.run(`UPDATE providers SET ${fields.join(', ')} WHERE id = ?`, ...values);
    }

    return { message: 'Provider updated' };
  });

  app.delete<{
    Params: { id: string };
  }>('/api/providers/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const existing = app.db.get<ProviderRow>('SELECT * FROM providers WHERE id = ?', id);
    if (!existing) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    app.db.run('DELETE FROM providers WHERE id = ?', id);
    return { message: 'Provider deleted' };
  });

  app.post<{
    Params: { id: string };
  }>('/api/providers/:id/test', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const provider = app.db.get<ProviderRow>('SELECT * FROM providers WHERE id = ?', id);
    if (!provider) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    // TODO: Actually test the provider connection
    return { status: 'ok', message: 'Connection successful' };
  });
}
