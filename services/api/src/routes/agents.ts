import type { VestaraApp } from '../types.js';
import { authMiddleware } from './auth.js';
import { generateId } from '@vestara/utils';

interface AgentRow {
  id: string;
  user_id: string;
  name: string;
  type: string;
  provider_id: string | null;
  model_id: string | null;
  config: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function registerAgentRoutes(app: VestaraApp) {
  app.get('/api/agents', {
    preHandler: [authMiddleware],
  }, async (request) => {
    const userId = (request as any).userId;
    const agents = app.db.all<AgentRow>(
      'SELECT * FROM agents WHERE user_id = ? ORDER BY created_at DESC',
      userId,
    );
    return {
      agents: agents.map((a) => ({
        ...a,
        config: JSON.parse(a.config),
      })),
    };
  });

  app.post<{
    Body: { name: string; type: string; providerId?: string; modelId?: string; config?: Record<string, unknown> };
  }>('/api/agents', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const userId = (request as any).userId;
    const { name, type, providerId, modelId, config } = request.body;
    const id = generateId();

    app.db.run(
      'INSERT INTO agents (id, user_id, name, type, provider_id, model_id, config) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id, userId, name, type, providerId || null, modelId || null, JSON.stringify(config || {}),
    );

    const agent = app.db.get<AgentRow>('SELECT * FROM agents WHERE id = ?', id);
    return reply.status(201).send({
      agent: { ...agent!, config: JSON.parse(agent!.config) },
    });
  });

  app.patch<{
    Params: { id: string };
    Body: { name?: string; providerId?: string; modelId?: string; config?: Record<string, unknown> };
  }>('/api/agents/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;
    const updates = request.body;

    const existing = app.db.get<AgentRow>(
      'SELECT * FROM agents WHERE id = ? AND user_id = ?',
      id, userId,
    );
    if (!existing) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.providerId !== undefined) { fields.push('provider_id = ?'); values.push(updates.providerId); }
    if (updates.modelId !== undefined) { fields.push('model_id = ?'); values.push(updates.modelId); }
    if (updates.config !== undefined) { fields.push('config = ?'); values.push(JSON.stringify(updates.config)); }

    if (fields.length > 0) {
      fields.push('updated_at = datetime(\'now\')');
      values.push(id);
      app.db.run(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`, ...values);
    }

    return { message: 'Agent updated' };
  });

  app.post<{
    Params: { id: string };
    Body: { input: string };
  }>('/api/agents/:id/run', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;
    const { input } = request.body;

    const agent = app.db.get<AgentRow>(
      'SELECT * FROM agents WHERE id = ? AND user_id = ?',
      id, userId,
    );
    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    // Create execution record
    const executionId = generateId();
    app.db.run(
      'INSERT INTO agent_executions (id, agent_id, input, started_at) VALUES (?, ?, ?, datetime(\'now\'))',
      executionId, id, input,
    );

    // TODO: Actually execute the agent with AI provider
    const output = 'Agent execution placeholder. AI integration coming soon.';

    app.db.run(
      'UPDATE agent_executions SET output = ?, completed_at = datetime(\'now\') WHERE id = ?',
      output, executionId,
    );

    return {
      execution: {
        id: executionId,
        agentId: id,
        input,
        output,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    };
  });

  app.delete<{
    Params: { id: string };
  }>('/api/agents/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;

    const existing = app.db.get<AgentRow>(
      'SELECT * FROM agents WHERE id = ? AND user_id = ?',
      id, userId,
    );
    if (!existing) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    app.db.run('DELETE FROM agent_executions WHERE agent_id = ?', id);
    app.db.run('DELETE FROM agents WHERE id = ?', id);

    return { message: 'Agent deleted' };
  });
}
