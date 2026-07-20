import type { FastifyInstance } from 'fastify';
import { authMiddleware } from './auth.js';
import { generateId } from '@vestara/utils';

interface MemoryRow {
  id: string;
  user_id: string;
  type: string;
  key: string;
  value: string;
  context: string | null;
  importance: number;
  created_at: string;
  updated_at: string;
}

export function registerMemoryRoutes(app: FastifyInstance) {
  app.get('/api/memory', {
    preHandler: [authMiddleware],
  }, async (request) => {
    const userId = (request as any).userId;
    const memories = app.db.all<MemoryRow>(
      'SELECT * FROM memories WHERE user_id = ? ORDER BY importance DESC, created_at DESC',
      userId,
    );
    return { memories };
  });

  app.post<{
    Body: { key: string; value: string; type?: string; context?: string; importance?: number };
  }>('/api/memory', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const userId = (request as any).userId;
    const { key, value, type = 'long_term', context, importance = 0.5 } = request.body;
    const id = generateId();

    app.db.run(
      'INSERT INTO memories (id, user_id, type, key, value, context, importance) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id, userId, type, key, value, context || null, importance,
    );

    const memory = app.db.get<MemoryRow>('SELECT * FROM memories WHERE id = ?', id);
    return reply.status(201).send({ memory });
  });

  app.get<{
    Querystring: { q?: string; type?: string };
  }>('/api/memory/search', {
    preHandler: [authMiddleware],
  }, async (request) => {
    const userId = (request as any).userId;
    const { q, type } = request.query;

    let sql = 'SELECT * FROM memories WHERE user_id = ?';
    const params: unknown[] = [userId];

    if (q) {
      sql += ' AND (key LIKE ? OR value LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY importance DESC, created_at DESC LIMIT 50';

    const memories = app.db.all<MemoryRow>(sql, ...params);
    return { memories };
  });

  app.delete<{
    Params: { id: string };
  }>('/api/memory/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;

    const existing = app.db.get<MemoryRow>(
      'SELECT * FROM memories WHERE id = ? AND user_id = ?',
      id, userId,
    );
    if (!existing) {
      return reply.status(404).send({ error: 'Memory not found' });
    }

    app.db.run('DELETE FROM memories WHERE id = ?', id);
    return { message: 'Memory deleted' };
  });
}
