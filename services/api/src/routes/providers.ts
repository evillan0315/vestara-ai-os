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

  /**
   * Test provider connection
   */
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

    const start = Date.now();
    try {
      switch (provider.type) {
        case 'ollama': {
          const res = await fetch(`${provider.base_url || 'http://localhost:11434'}/api/tags`);
          if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
          break;
        }
        case 'openai': {
          if (!provider.api_key_encrypted) throw new Error('API key required');
          const res = await fetch(`${provider.base_url || 'https://api.openai.com/v1'}/models`, {
            headers: { Authorization: `Bearer ${provider.api_key_encrypted}` },
          });
          if (!res.ok) throw new Error(`OpenAI returned ${res.status}`);
          break;
        }
        case 'anthropic': {
          if (!provider.api_key_encrypted) throw new Error('API key required');
          const res = await fetch(`${provider.base_url || 'https://api.anthropic.com'}/v1/messages`, {
            method: 'POST',
            headers: {
              'x-api-key': provider.api_key_encrypted,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({ model: 'claude-haiku-3.5', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
          });
          if (!res.ok && res.status !== 400) throw new Error(`Anthropic returned ${res.status}`);
          break;
        }
        case 'google': {
          if (!provider.api_key_encrypted) throw new Error('API key required');
          const res = await fetch(`${provider.base_url || 'https://generativelanguage.googleapis.com/v1beta'}/models?key=${provider.api_key_encrypted}`);
          if (!res.ok) throw new Error(`Google returned ${res.status}`);
          break;
        }
        case 'opencode': {
          const res = await fetch(`${provider.base_url || 'http://localhost:4096'}/`);
          if (!res.ok) throw new Error(`OpenCode returned ${res.status}`);
          break;
        }
        case 'openrouter': {
          if (!provider.api_key_encrypted) throw new Error('API key required');
          const res = await fetch(`${provider.base_url || 'https://openrouter.ai/api/v1'}/models`, {
            headers: { Authorization: `Bearer ${provider.api_key_encrypted}` },
          });
          if (!res.ok) throw new Error(`OpenRouter returned ${res.status}`);
          break;
        }
        default:
          return { status: 'ok', message: 'Connection test not supported for this provider', latency: Date.now() - start };
      }
      return { status: 'ok', message: 'Connection successful', latency: Date.now() - start };
    } catch (e) {
      return { status: 'error', message: e instanceof Error ? e.message : 'Connection failed', latency: Date.now() - start };
    }
  });

  /**
   * List available models for a provider
   */
  app.get<{
    Params: { id: string };
  }>('/api/providers/:id/models', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const provider = app.db.get<ProviderRow>('SELECT * FROM providers WHERE id = ?', id);
    if (!provider) {
      return reply.status(404).send({ error: 'Provider not found' });
    }

    try {
      switch (provider.type) {
        case 'ollama': {
          const res = await fetch(`${provider.base_url || 'http://localhost:11434'}/api/tags`);
          if (!res.ok) throw new Error('Ollama not available');
          const data = await res.json() as { models?: { name: string; size: number; modified_at: string }[] };
          return {
            models: (data.models || []).map((m) => ({
              id: m.name,
              name: m.name,
              size: m.size,
              modified: m.modified_at,
            })),
          };
        }
        case 'opencode': {
          const res = await fetch(`${provider.base_url || 'http://localhost:4096'}/api/models`);
          if (!res.ok) return { models: [] };
          const data = await res.json() as { models?: { id: string; name: string }[] };
          return { models: data.models || [] };
        }
        default:
          return { models: [] };
      }
    } catch {
      return { models: [] };
    }
  });
}
