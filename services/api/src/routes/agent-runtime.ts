import type { VestaraApp } from '../types.js';
import { authMiddleware } from './auth.js';

export function registerAgentRuntimeRoutes(app: VestaraApp) {
  // Get agent stats
  app.get('/api/agents/stats', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const userId = (request as any).userId;
    const stats = await (app as any).agentRuntime.getAgentStats(userId);
    return reply.send(stats);
  });

  // List agents
  app.get('/api/agents', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { type } = request.query as { type?: string };
    const userId = (request as any).userId;

    const agents = await (app as any).agentRuntime.listAgents(userId, type);
    return reply.send(agents);
  });

  // Create agent
  app.post('/api/agents', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { name, type, model, systemPrompt, description, temperature, maxTokens, tools } = request.body as any;
    const userId = (request as any).userId;

    if (!name || !type || !model) {
      return reply.status(400).send({ error: 'name, type, and model are required' });
    }

    const agent = await (app as any).agentRuntime.createAgent(
      userId,
      name,
      type,
      model,
      systemPrompt || '',
      { description, temperature, maxTokens, tools }
    );
    return reply.status(201).send(agent);
  });

  // Get agent
  app.get<{
    Params: { id: string };
  }>('/api/agents/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const agent = (app as any).agentRuntime.getAgent(Number(id));
    return reply.send(agent);
  });

  // Update agent
  app.put<{
    Params: { id: string };
  }>('/api/agents/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const updates = request.body as any;

    const agent = await (app as any).agentRuntime.updateAgent(Number(id), updates);
    return reply.send(agent);
  });

  // Delete agent
  app.delete<{
    Params: { id: string };
  }>('/api/agents/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    await (app as any).agentRuntime.deleteAgent(Number(id));
    return reply.status(204).send();
  });

  // Execute task
  app.post<{
    Params: { id: string };
  }>('/api/agents/:id/execute', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const { input, conversationId } = request.body as any;
    const userId = (request as any).userId;

    if (!input) {
      return reply.status(400).send({ error: 'input is required' });
    }

    const task = await (app as any).agentRuntime.executeTask(
      Number(id),
      userId,
      input,
      conversationId
    );
    return reply.send(task);
  });

  // Cancel task
  app.post<{
    Params: { taskId: string };
  }>('/api/tasks/:taskId/cancel', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { taskId } = request.params;
    (app as any).agentRuntime.cancelTask(Number(taskId));
    return reply.send({ success: true });
  });

  // List tasks
  app.get('/api/tasks', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { agentId, status, limit } = request.query as any;
    const userId = (request as any).userId;

    const tasks = await (app as any).agentRuntime.listTasks(
      userId,
      agentId ? Number(agentId) : undefined,
      status,
      limit
    );
    return reply.send(tasks);
  });

  // Get task
  app.get<{
    Params: { id: string };
  }>('/api/tasks/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const task = (app as any).agentRuntime.getTask(Number(id));
    return reply.send(task);
  });

  // List available tools
  app.get('/api/agents/tools', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const tools = (app as any).agentRuntime.getTools();
    return reply.send(tools.map((t: any) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    })));
  });
}
