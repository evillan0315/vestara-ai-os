import type { VestaraApp } from '../types.js';
import { authMiddleware } from './auth.js';

export function registerMemoryRoutes(app: VestaraApp) {
  // Get memory stats
  app.get('/api/memory/stats', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const userId = (request as any).userId;
    const stats = await (app as any).memoryService.getMemoryStats(userId);
    return reply.send(stats);
  });

  // Search memories
  app.get('/api/memory/search', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { type, query, limit } = request.query as any;
    const userId = (request as any).userId;

    if (!query) {
      return reply.status(400).send({ error: 'Query parameter required' });
    }

    const memories = await (app as any).memoryService.searchMemories(
      userId,
      query,
      type,
      limit
    );
    return reply.send(memories);
  });

  // Get recent memories
  app.get('/api/memory', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { limit } = request.query as { limit?: number };
    const userId = (request as any).userId;

    const memories = await (app as any).memoryService.getRecentMemories(userId, limit);
    return reply.send(memories);
  });

  // Get important memories
  app.get('/api/memory/important', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { limit } = request.query as { limit?: number };
    const userId = (request as any).userId;

    const memories = await (app as any).memoryService.getImportantMemories(userId, limit);
    return reply.send(memories);
  });

  // Add a memory
  app.post('/api/memory', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { type, content, importance, metadata } = request.body as any;
    const userId = (request as any).userId;

    if (!type || !content) {
      return reply.status(400).send({ error: 'type and content are required' });
    }

    const memory = await (app as any).memoryService.addMemory(
      userId,
      type,
      content,
      importance,
      metadata
    );
    return reply.status(201).send(memory);
  });

  // Get a specific memory
  app.get<{
    Params: { id: string };
  }>('/api/memory/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const memory = await (app as any).memoryService.getMemory(Number(id));
    return reply.send(memory);
  });

  // Delete a memory
  app.delete<{
    Params: { id: string };
  }>('/api/memory/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    await (app as any).memoryService.deleteMemory(Number(id));
    return reply.status(204).send();
  });

  // Consolidate memories
  app.post('/api/memory/consolidate', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const userId = (request as any).userId;
    const consolidations = await (app as any).memoryService.consolidateMemories(userId);
    return reply.send({ consolidated: consolidations.length, consolidations });
  });

  // Get consolidations
  app.get('/api/memory/consolidations', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { limit } = request.query as { limit?: number };
    const userId = (request as any).userId;

    const consolidations = await (app as any).memoryService.getConsolidations(userId, limit);
    return reply.send(consolidations);
  });
}
