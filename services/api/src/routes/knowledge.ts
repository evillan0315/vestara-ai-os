import type { VestaraApp } from '../types.js';
import { authMiddleware } from './auth.js';

export function registerKnowledgeRoutes(app: VestaraApp) {
  // Get knowledge stats
  app.get('/api/knowledge/stats', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const projectId = Number((request.query as any)?.projectId) || 0;
    const stats = await (app as any).knowledgeService.getStats(projectId);
    return reply.send(stats);
  });

  // Search knowledge
  app.get('/api/knowledge/search', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { projectId, type, query, tags, limit } = request.query as any;

    if (!query) {
      return reply.status(400).send({ error: 'Query parameter required' });
    }

    const tagArray = tags ? tags.split(',').map((t: string) => t.trim()) : undefined;
    const results = await (app as any).knowledgeService.search(
      projectId || null,
      query,
      type,
      tagArray,
      limit
    );
    return reply.send(results);
  });

  // List knowledge entries
  app.get('/api/knowledge', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { projectId, type, limit, offset } = request.query as any;

    const entries = await (app as any).knowledgeService.getEntries(
      projectId || null,
      type,
      limit,
      offset
    );
    return reply.send(entries);
  });

  // Add a knowledge entry
  app.post('/api/knowledge', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { projectId, type, title, content, tags, source, metadata } = request.body as any;

    if (!type || !title || !content) {
      return reply.status(400).send({ error: 'type, title, and content are required' });
    }

    const entry = await (app as any).knowledgeService.addEntry(
      projectId || null,
      type,
      title,
      content,
      tags,
      source,
      metadata
    );
    return reply.status(201).send(entry);
  });

  // Get a specific knowledge entry
  app.get<{
    Params: { id: string };
  }>('/api/knowledge/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const entry = (app as any).knowledgeService.getEntry(Number(id));
    return reply.send(entry);
  });

  // Update a knowledge entry
  app.put<{
    Params: { id: string };
  }>('/api/knowledge/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const { title, content, tags, metadata } = request.body as any;

    const entry = await (app as any).knowledgeService.updateEntry(Number(id), {
      title,
      content,
      tags,
      metadata,
    });
    return reply.send(entry);
  });

  // Delete a knowledge entry
  app.delete<{
    Params: { id: string };
  }>('/api/knowledge/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    await (app as any).knowledgeService.deleteEntry(Number(id));
    return reply.status(204).send();
  });

  // Get context for a query
  app.get('/api/knowledge/context', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { projectId, query } = request.query as any;

    if (!query) {
      return reply.status(400).send({ error: 'Query parameter required' });
    }

    const context = await (app as any).knowledgeService.getContextForQuery(
      projectId || null,
      query
    );
    return reply.send({ context });
  });
}
