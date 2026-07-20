import type { FastifyInstance } from 'fastify';
import { authMiddleware } from './auth.js';
import { generateId } from '@vestara/utils';

interface DocumentRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  metadata: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function registerKnowledgeRoutes(app: FastifyInstance) {
  app.get('/api/knowledge', {
    preHandler: [authMiddleware],
  }, async (request) => {
    const userId = (request as any).userId;
    const documents = app.db.all<DocumentRow>(
      'SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC',
      userId,
    );
    return {
      documents: documents.map((d) => ({
        ...d,
        metadata: JSON.parse(d.metadata),
      })),
    };
  });

  app.post<{
    Body: { title: string; content: string; metadata?: Record<string, unknown> };
  }>('/api/knowledge/upload', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const userId = (request as any).userId;
    const { title, content, metadata } = request.body;
    const id = generateId();

    app.db.run(
      'INSERT INTO documents (id, user_id, title, content, metadata, status) VALUES (?, ?, ?, ?, ?, ?)',
      id, userId, title, content, JSON.stringify(metadata || {}), 'indexed',
    );

    // TODO: Generate embeddings in background

    return reply.status(201).send({
      document: { id, title, status: 'indexed' },
    });
  });

  app.get<{
    Querystring: { q: string; limit?: number };
  }>('/api/knowledge/search', {
    preHandler: [authMiddleware],
  }, async (request) => {
    const userId = (request as any).userId;
    const { q, limit = 5 } = request.query;

    // Simple text search (TODO: Implement semantic search with embeddings)
    const documents = app.db.all<DocumentRow>(
      'SELECT * FROM documents WHERE user_id = ? AND (title LIKE ? OR content LIKE ?) LIMIT ?',
      userId, `%${q}%`, `%${q}%`, limit,
    );

    return {
      results: documents.map((d) => ({
        ...d,
        metadata: JSON.parse(d.metadata),
        score: 1.0, // Placeholder
      })),
    };
  });

  app.delete<{
    Params: { id: string };
  }>('/api/knowledge/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;

    const existing = app.db.get<DocumentRow>(
      'SELECT * FROM documents WHERE id = ? AND user_id = ?',
      id, userId,
    );
    if (!existing) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    app.db.run('DELETE FROM documents WHERE id = ?', id);
    return { message: 'Document deleted' };
  });
}
