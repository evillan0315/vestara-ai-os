import { type Database, type EventBus, createLogger } from '@vestara/core';
import { generateId } from '@vestara/utils';
import type { AIProvider } from './provider.js';

const log = createLogger('agent-runtime');

export interface Agent {
  id: string;
  userId: string;
  name: string;
  description: string;
  type: 'assistant' | 'coder' | 'researcher' | 'analyzer' | 'custom';
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  tools: string[];
  isActive: boolean;
  metadata: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  agentId: string;
  userId: string;
  conversationId: string | null;
  input: string;
  output: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  tokensUsed: number;
  duration: number | null;
  error: string | null;
  metadata: string;
  createdAt: string;
  completedAt: string | null;
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool?: string;
  toolInput?: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<string>;
}

export class AgentRuntime {
  private db: Database;
  private events: EventBus;
  private aiProvider: AIProvider | null;
  private tools: Map<string, ToolDefinition> = new Map();
  private activeTasks: Map<string, AbortController> = new Map();

  constructor(db: Database, events: EventBus, aiProvider?: AIProvider) {
    this.db = db;
    this.events = events;
    this.aiProvider = aiProvider ?? null;
    this.registerDefaultTools();
  }

  private registerDefaultTools(): void {
    this.registerTool({
      name: 'web_search',
      description: 'Search the web for information',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
      execute: async (input) => {
        return `Search results for "${input.query}": [Results would appear here]`;
      },
    });

    this.registerTool({
      name: 'read_file',
      description: 'Read contents of a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
        },
        required: ['path'],
      },
      execute: async (input) => {
        const fs = await import('fs/promises');
        try {
          const content = await fs.readFile(input.path as string, 'utf-8');
          return content;
        } catch (err) {
          return `Error reading file: ${err}`;
        }
      },
    });

    this.registerTool({
      name: 'execute_code',
      description: 'Execute code in a sandboxed environment',
      parameters: {
        type: 'object',
        properties: {
          language: { type: 'string', description: 'Programming language' },
          code: { type: 'string', description: 'Code to execute' },
        },
        required: ['language', 'code'],
      },
      execute: async (input) => {
        return `Code execution result for ${input.language}: [Output would appear here]`;
      },
    });

    this.registerTool({
      name: 'db_query',
      description: 'Execute a database query',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'SQL query' },
        },
        required: ['query'],
      },
      execute: async (input) => {
        try {
          const result = this.db.prepare(input.query as string).all();
          return JSON.stringify(result, null, 2);
        } catch (err) {
          return `Query error: ${err}`;
        }
      },
    });
  }

  registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
    log.info({ tool: tool.name }, 'Tool registered');
  }

  getTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  async createAgent(
    userId: string,
    name: string,
    type: Agent['type'],
    model: string,
    systemPrompt: string,
    options: Partial<Pick<Agent, 'description' | 'temperature' | 'maxTokens' | 'tools'>> & { metadata?: Record<string, unknown> } = {}
  ): Promise<Agent> {
    const id = generateId();
    this.db.prepare(`
      INSERT INTO agents (id, user_id, name, description, type, model, system_prompt, temperature, max_tokens, tools, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      name,
      options.description || '',
      type,
      model,
      systemPrompt,
      options.temperature ?? 0.7,
      options.maxTokens ?? 4096,
      JSON.stringify(options.tools || []),
      JSON.stringify(options.metadata || {})
    );

    const agent = this.getAgent(id);
    this.events.emit('agent:created', { agent });

    log.info({ agentId: agent.id, name, type }, 'Agent created');
    return agent;
  }

  getAgent(id: string): Agent {
    const row = this.db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as any;
    if (!row) throw new Error(`Agent ${id} not found`);
    return this.mapAgent(row);
  }

  async listAgents(userId: string, type?: Agent['type']): Promise<Agent[]> {
    let sql = 'SELECT * FROM agents WHERE user_id = ?';
    const params: any[] = [userId];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY updated_at DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(this.mapAgent);
  }

  async updateAgent(
    id: string,
    updates: Partial<Pick<Agent, 'name' | 'description' | 'model' | 'systemPrompt' | 'temperature' | 'maxTokens' | 'tools' | 'isActive'>> & { metadata?: Record<string, unknown> }
  ): Promise<Agent> {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      params.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      params.push(updates.description);
    }
    if (updates.model !== undefined) {
      fields.push('model = ?');
      params.push(updates.model);
    }
    if (updates.systemPrompt !== undefined) {
      fields.push('system_prompt = ?');
      params.push(updates.systemPrompt);
    }
    if (updates.temperature !== undefined) {
      fields.push('temperature = ?');
      params.push(updates.temperature);
    }
    if (updates.maxTokens !== undefined) {
      fields.push('max_tokens = ?');
      params.push(updates.maxTokens);
    }
    if (updates.tools !== undefined) {
      fields.push('tools = ?');
      params.push(JSON.stringify(updates.tools));
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }
    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      params.push(updates.isActive ? 1 : 0);
    }

    if (fields.length === 0) return this.getAgent(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    this.db.prepare(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    const agent = this.getAgent(id);
    this.events.emit('agent:updated', { agent });

    log.info({ agentId: id }, 'Agent updated');
    return agent;
  }

  async deleteAgent(id: string): Promise<void> {
    this.db.prepare('DELETE FROM agents WHERE id = ?').run(id);
    this.events.emit('agent:deleted', { id });
    log.info({ id }, 'Agent deleted');
  }

  async executeTask(
    agentId: string,
    userId: string,
    input: string,
    conversationId?: string,
    signal?: AbortSignal
  ): Promise<Task> {
    const taskId = generateId();
    const startTime = Date.now();

    try {
      const agent = this.getAgent(agentId);

      this.db.prepare(`
        INSERT INTO agent_executions (id, agent_id, user_id, conversation_id, input, status)
        VALUES (?, ?, ?, ?, ?, 'running')
      `).run(taskId, agentId, userId, conversationId || null, input);

      const task = this.getTask(taskId);
      this.events.emit('task:started', { task });

      // Build message history
      const messages: AgentMessage[] = [
        { role: 'system', content: agent.systemPrompt },
        { role: 'user', content: input },
      ];

      // Execute with AI model or fallback mock
      let output = '';
      if (this.aiProvider) {
        const response = await this.aiProvider.chat({
          messages,
          model: agent.model,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
        });
        output = response.content;
      } else {
        // Fallback mock output when no AI provider is configured
        output = `Agent "${agent.name}" processed: "${input}"`;
      }

      const duration = Date.now() - startTime;

      // Update task
      this.db.prepare(`
        UPDATE agent_executions
        SET output = ?, status = 'completed', duration = ?, completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(output, duration, taskId);

      const completedTask = this.getTask(taskId);
      this.events.emit('task:completed', { task: completedTask });

      log.info({ taskId, agentId, duration }, 'Task completed');
      return completedTask;

    } catch (err) {
      const duration = Date.now() - startTime;
      const error = err instanceof Error ? err.message : String(err);

      // Use null agent_id if the referenced agent doesn't exist (avoids FK errors)
      const effectiveAgentId = this.db.get<{ id: string }>('SELECT id FROM agents WHERE id = ?', agentId)?.id ?? null;

      // Insert failed task record (may already exist if we got past task creation)
      const existing = this.db.get<{ id: string }>('SELECT id FROM agent_executions WHERE id = ?', taskId);
      if (existing) {
        this.db.prepare(`
          UPDATE agent_executions
          SET status = 'failed', error = ?, duration = ?, completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(error, duration, taskId);
      } else {
        this.db.prepare(`
          INSERT INTO agent_executions (id, agent_id, user_id, conversation_id, input, status, error, duration, completed_at)
          VALUES (?, ?, ?, ?, ?, 'failed', ?, ?, CURRENT_TIMESTAMP)
        `).run(taskId, effectiveAgentId, userId, conversationId || null, input, error, duration);
      }

      const failedTask = this.getTask(taskId);
      this.events.emit('task:failed', { task: failedTask, error });

      log.error({ taskId, agentId, error }, 'Task failed');
      return failedTask;
    }
  }

  cancelTask(taskId: string): void {
    const controller = this.activeTasks.get(taskId);
    if (controller) {
      controller.abort();
      this.activeTasks.delete(taskId);
    }

    this.db.prepare(`
      UPDATE agent_executions SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status IN ('pending', 'running')
    `).run(taskId);

    log.info({ taskId }, 'Task cancelled');
  }

  getTask(id: string): Task {
    const row = this.db.prepare('SELECT * FROM agent_executions WHERE id = ?').get(id) as any;
    if (!row) throw new Error(`Task ${id} not found`);
    return this.mapTask(row);
  }

  async listTasks(
    userId: string,
    agentId?: string,
    status?: Task['status'],
    limit: number = 50
  ): Promise<Task[]> {
    let sql = 'SELECT * FROM agent_executions WHERE user_id = ?';
    const params: any[] = [userId];

    if (agentId) {
      sql += ' AND agent_id = ?';
      params.push(agentId);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY started_at DESC LIMIT ?';
    params.push(limit);

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(this.mapTask);
  }

  async getAgentStats(userId: string): Promise<{
    totalAgents: number;
    byType: Record<string, number>;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    avgDuration: number;
  }> {
    const totalAgents = this.db.prepare(
      'SELECT COUNT(*) as count FROM agents WHERE user_id = ?'
    ).get(userId) as any;

    const byType = this.db.prepare(`
      SELECT type, COUNT(*) as count
      FROM agents WHERE user_id = ?
      GROUP BY type
    `).all(userId) as any[];

    const totalTasks = this.db.prepare(
      'SELECT COUNT(*) as count FROM agent_executions WHERE user_id = ?'
    ).get(userId) as any;

    const completedTasks = this.db.prepare(
      "SELECT COUNT(*) as count FROM agent_executions WHERE user_id = ? AND status = 'completed'"
    ).get(userId) as any;

    const failedTasks = this.db.prepare(
      "SELECT COUNT(*) as count FROM agent_executions WHERE user_id = ? AND status = 'failed'"
    ).get(userId) as any;

    const avgDuration = this.db.prepare(
      "SELECT AVG(duration) as avg FROM agent_executions WHERE user_id = ? AND status = 'completed'"
    ).get(userId) as any;

    return {
      totalAgents: totalAgents.count,
      byType: Object.fromEntries(byType.map((r: any) => [r.type, r.count])),
      totalTasks: totalTasks.count,
      completedTasks: completedTasks.count,
      failedTasks: failedTasks.count,
      avgDuration: avgDuration.avg || 0,
    };
  }

  private mapAgent(row: any): Agent {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      type: row.type,
      model: row.model,
      systemPrompt: row.system_prompt,
      temperature: row.temperature,
      maxTokens: row.max_tokens,
      tools: JSON.parse(row.tools || '[]'),
      isActive: Boolean(row.is_active),
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapTask(row: any): Task {
    return {
      id: row.id,
      agentId: row.agent_id,
      userId: row.user_id,
      conversationId: row.conversation_id,
      input: row.input,
      output: row.output,
      status: row.status,
      tokensUsed: row.tokens || 0,
      duration: row.duration,
      error: row.error,
      metadata: row.metadata,
      createdAt: row.started_at,
      completedAt: row.completed_at,
    };
  }
}
