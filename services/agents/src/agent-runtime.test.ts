import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Database, EventBus, migrate } from '@vestara/core';
import { generateId } from '@vestara/utils';
import { AgentRuntime } from './agent-runtime.js';

describe('AgentRuntime', () => {
  let db: Database;
  let events: EventBus;
  let runtime: AgentRuntime;

  beforeEach(() => {
    db = new Database(':memory:');
    migrate(db);
    // Insert a default user for FK constraints
    db.run("INSERT INTO users (id, name, email, password_hash, role) VALUES ('user-1', 'User One', 'user1@test.com', 'hash', 'user')");
    db.run("INSERT INTO users (id, name, email, password_hash, role) VALUES ('user-2', 'User Two', 'user2@test.com', 'hash', 'user')");
    events = new EventBus();
    runtime = new AgentRuntime(db, events);
  });

  afterEach(() => {
    db.close();
  });

  describe('createAgent', () => {
    it('creates an agent with defaults', async () => {
      const agent = await runtime.createAgent('user-1', 'Test Agent', 'assistant', 'gpt-4', 'You are helpful');
      expect(agent.id).toMatch(/^[0-9a-f]{32}$/);
      expect(agent.userId).toBe('user-1');
      expect(agent.name).toBe('Test Agent');
      expect(agent.type).toBe('assistant');
      expect(agent.model).toBe('gpt-4');
      expect(agent.systemPrompt).toBe('You are helpful');
      expect(agent.temperature).toBe(0.7);
      expect(agent.maxTokens).toBe(4096);
      expect(agent.description).toBe('');
      expect(agent.tools).toEqual([]);
      expect(agent.isActive).toBe(true);
      expect(agent.createdAt).toBeTruthy();
      expect(agent.updatedAt).toBeTruthy();
    });

    it('creates an agent with custom options', async () => {
      const agent = await runtime.createAgent('user-1', 'Coder', 'coder', 'claude-3', 'You code', {
        description: 'A coding agent',
        temperature: 0.3,
        maxTokens: 8192,
        tools: ['read_file', 'execute_code'],
        metadata: { foo: 'bar' },
      });
      expect(agent.description).toBe('A coding agent');
      expect(agent.temperature).toBe(0.3);
      expect(agent.maxTokens).toBe(8192);
      expect(agent.tools).toEqual(['read_file', 'execute_code']);
      expect(agent.metadata).toBe('{"foo":"bar"}');
    });

    it('emits agent:created event', async () => {
      const handler = vi.fn();
      events.on('agent:created', handler);
      const agent = await runtime.createAgent('user-1', 'Test', 'assistant', 'gpt-4', '');
      expect(handler).toHaveBeenCalledWith({ agent });
    });
  });

  describe('getAgent', () => {
    it('returns an agent by id', async () => {
      const created = await runtime.createAgent('user-1', 'Test', 'assistant', 'gpt-4', '');
      const agent = runtime.getAgent(created.id);
      expect(agent.id).toBe(created.id);
    });

    it('throws for non-existent agent', () => {
      expect(() => runtime.getAgent('nonexistent')).toThrow('Agent nonexistent not found');
    });
  });

  describe('listAgents', () => {
    it('lists agents for a user', async () => {
      await runtime.createAgent('user-1', 'A1', 'assistant', 'gpt-4', '');
      await runtime.createAgent('user-1', 'A2', 'coder', 'claude-3', '');
      await runtime.createAgent('user-2', 'A3', 'assistant', 'gpt-4', '');
      const agents = await runtime.listAgents('user-1');
      expect(agents).toHaveLength(2);
    });

    it('filters by type', async () => {
      await runtime.createAgent('user-1', 'A1', 'assistant', 'gpt-4', '');
      await runtime.createAgent('user-1', 'A2', 'coder', 'claude-3', '');
      const agents = await runtime.listAgents('user-1', 'coder');
      expect(agents).toHaveLength(1);
      expect(agents[0].type).toBe('coder');
    });

    it('returns empty array when no agents exist', async () => {
      const agents = await runtime.listAgents('user-1');
      expect(agents).toEqual([]);
    });
  });

  describe('updateAgent', () => {
    it('updates all fields', async () => {
      const agent = await runtime.createAgent('user-1', 'Old', 'assistant', 'gpt-4', 'Old prompt');
      const updated = await runtime.updateAgent(agent.id, {
        name: 'New',
        description: 'New desc',
        model: 'claude-3',
        systemPrompt: 'New prompt',
        temperature: 0.1,
        maxTokens: 2048,
        tools: ['db_query'],
        metadata: { key: 'val' },
        isActive: false,
      });
      expect(updated.name).toBe('New');
      expect(updated.description).toBe('New desc');
      expect(updated.model).toBe('claude-3');
      expect(updated.systemPrompt).toBe('New prompt');
      expect(updated.temperature).toBe(0.1);
      expect(updated.maxTokens).toBe(2048);
      expect(updated.tools).toEqual(['db_query']);
      expect(updated.isActive).toBe(false);
    });

    it('with no updates returns the agent unchanged', async () => {
      const agent = await runtime.createAgent('user-1', 'Test', 'assistant', 'gpt-4', 'Prompt');
      const updated = await runtime.updateAgent(agent.id, {});
      expect(updated.name).toBe('Test');
    });

    it('emits agent:updated event', async () => {
      const handler = vi.fn();
      events.on('agent:updated', handler);
      const agent = await runtime.createAgent('user-1', 'Test', 'assistant', 'gpt-4', '');
      await runtime.updateAgent(agent.id, { name: 'Updated' });
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('deleteAgent', () => {
    it('deletes an agent', async () => {
      const agent = await runtime.createAgent('user-1', 'Test', 'assistant', 'gpt-4', '');
      await runtime.deleteAgent(agent.id);
      expect(() => runtime.getAgent(agent.id)).toThrow();
    });

    it('emits agent:deleted event', async () => {
      const handler = vi.fn();
      events.on('agent:deleted', handler);
      const agent = await runtime.createAgent('user-1', 'Test', 'assistant', 'gpt-4', '');
      await runtime.deleteAgent(agent.id);
      expect(handler).toHaveBeenCalledWith({ id: agent.id });
    });

    it('does not throw when deleting nonexistent agent', async () => {
      await expect(runtime.deleteAgent('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('registerTool / getTools', () => {
    it('registers a custom tool', () => {
      runtime.registerTool({
        name: 'my_tool',
        description: 'My custom tool',
        parameters: { type: 'object', properties: { x: { type: 'string' } } },
        execute: async () => 'done',
      });
      const tools = runtime.getTools();
      expect(tools.some(t => t.name === 'my_tool')).toBe(true);
    });

    it('starts with four default tools', () => {
      const tools = runtime.getTools();
      const names = tools.map(t => t.name);
      expect(names).toContain('web_search');
      expect(names).toContain('read_file');
      expect(names).toContain('execute_code');
      expect(names).toContain('db_query');
    });
  });

  describe('executeTask', () => {
    it('executes a task successfully', async () => {
      const agent = await runtime.createAgent('user-1', 'Helper', 'assistant', 'gpt-4', 'You are helpful');
      const task = await runtime.executeTask(agent.id, 'user-1', 'Hello');
      expect(task.id).toMatch(/^[0-9a-f]{32}$/);
      expect(task.agentId).toBe(agent.id);
      expect(task.userId).toBe('user-1');
      expect(task.input).toBe('Hello');
      expect(task.status).toBe('completed');
      expect(task.output).toContain('Helper');
      expect(task.output).toContain('Hello');
      expect(task.duration).toBeGreaterThanOrEqual(0);
      expect(task.completedAt).toBeTruthy();
    });

    it('fails gracefully when agent does not exist', async () => {
      const task = await runtime.executeTask('bad-id', 'user-1', 'Hello');
      expect(task.status).toBe('failed');
      expect(task.error).toContain('not found');
    });

    it('emits task lifecycle events', async () => {
      const started = vi.fn();
      const completed = vi.fn();
      events.on('task:started', started);
      events.on('task:completed', completed);
      const agent = await runtime.createAgent('user-1', 'Test', 'assistant', 'gpt-4', '');
      await runtime.executeTask(agent.id, 'user-1', 'Hello');
      expect(started).toHaveBeenCalledTimes(1);
      expect(completed).toHaveBeenCalledTimes(1);
    });

    it('accepts a conversation id', async () => {
      const agent = await runtime.createAgent('user-1', 'Test', 'assistant', 'gpt-4', '');
      const task = await runtime.executeTask(agent.id, 'user-1', 'Hi', 'conv-123');
      expect(task.conversationId).toBe('conv-123');
    });
  });

  describe('cancelTask', () => {
    it('cancels a pending task', async () => {
      const agent = await runtime.createAgent('user-1', 'Test', 'assistant', 'gpt-4', '');
      const taskId = generateId();
      db.prepare(`
        INSERT INTO agent_executions (id, agent_id, user_id, input, status)
        VALUES (?, ?, ?, ?, 'pending')
      `).run(taskId, agent.id, 'user-1', 'test');

      runtime.cancelTask(taskId);
      const task = runtime.getTask(taskId);
      expect(task.status).toBe('cancelled');
      expect(task.completedAt).toBeTruthy();
    });

    it('is a no-op for unknown task id', () => {
      expect(() => runtime.cancelTask('nonexistent')).not.toThrow();
    });
  });

  describe('getTask', () => {
    it('throws for non-existent task', () => {
      expect(() => runtime.getTask('nonexistent')).toThrow('Task nonexistent not found');
    });
  });

  describe('listTasks', () => {
    it('lists tasks for a user', async () => {
      const agent = await runtime.createAgent('user-1', 'Test', 'assistant', 'gpt-4', '');
      await runtime.executeTask(agent.id, 'user-1', 'Task 1');
      await runtime.executeTask(agent.id, 'user-1', 'Task 2');
      const tasks = await runtime.listTasks('user-1');
      expect(tasks).toHaveLength(2);
    });

    it('filters by agent and status', async () => {
      const a1 = await runtime.createAgent('user-1', 'A1', 'assistant', 'gpt-4', '');
      const a2 = await runtime.createAgent('user-1', 'A2', 'coder', 'gpt-4', '');
      await runtime.executeTask(a1.id, 'user-1', 'T1');
      await runtime.executeTask(a2.id, 'user-1', 'T2');
      const tasks = await runtime.listTasks('user-1', a1.id, 'completed');
      expect(tasks).toHaveLength(1);
      expect(tasks[0].agentId).toBe(a1.id);
    });

    it('respects limit parameter', async () => {
      const agent = await runtime.createAgent('user-1', 'Test', 'assistant', 'gpt-4', '');
      for (let i = 0; i < 5; i++) {
        await runtime.executeTask(agent.id, 'user-1', `Task ${i}`);
      }
      const tasks = await runtime.listTasks('user-1', undefined, undefined, 2);
      expect(tasks).toHaveLength(2);
    });

    it('returns empty array for user with no tasks', async () => {
      const tasks = await runtime.listTasks('nobody');
      expect(tasks).toEqual([]);
    });
  });

  describe('getAgentStats', () => {
    it('returns correct aggregate stats', async () => {
      const a1 = await runtime.createAgent('user-1', 'A1', 'assistant', 'gpt-4', '');
      const a2 = await runtime.createAgent('user-1', 'A2', 'coder', 'gpt-4', '');
      await runtime.executeTask(a1.id, 'user-1', 'Task');
      await runtime.executeTask(a2.id, 'user-1', 'Task');

      const stats = await runtime.getAgentStats('user-1');
      expect(stats.totalAgents).toBe(2);
      expect(stats.byType).toEqual({ assistant: 1, coder: 1 });
      expect(stats.totalTasks).toBe(2);
      expect(stats.completedTasks).toBe(2);
      expect(stats.failedTasks).toBe(0);
      expect(stats.avgDuration).toBeGreaterThanOrEqual(0);
    });

    it('returns zeros for user with no data', async () => {
      const stats = await runtime.getAgentStats('nobody');
      expect(stats.totalAgents).toBe(0);
      expect(stats.byType).toEqual({});
      expect(stats.totalTasks).toBe(0);
      expect(stats.completedTasks).toBe(0);
      expect(stats.failedTasks).toBe(0);
      expect(stats.avgDuration).toBe(0);
    });
  });
});
