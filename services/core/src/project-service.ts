import type { Database } from './db.js';
import type { EventBus } from './events.js';
import { createLogger } from './logger.js';
import { generateId } from '@vestara/utils';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const log = createLogger('project-service');

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: string;
  path: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
}

export class ProjectService {
  private db: Database;
  private events: EventBus;

  constructor(db: Database, events: EventBus) {
    this.db = db;
    this.events = events;
  }

  async listProjects(userId: string): Promise<Project[]> {
    const rows = this.db.all<any>(
      'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
      userId,
    );
    return rows.map(this.mapProject);
  }

  async getProject(id: string, userId: string): Promise<Project | null> {
    const row = this.db.get<any>(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      id, userId,
    );
    return row ? this.mapProject(row) : null;
  }

  async createProject(userId: string, data: { name: string; description?: string; path?: string }): Promise<Project> {
    const id = generateId();
    this.db.run(
      'INSERT INTO projects (id, user_id, name, description, path) VALUES (?, ?, ?, ?, ?)',
      id, userId, data.name, data.description || null, data.path || null,
    );
    const row = this.db.get<any>('SELECT * FROM projects WHERE id = ?', id);
    const project = this.mapProject(row);
    this.events.emit('project:created', { userId, project });
    log.info({ userId, projectId: id }, 'Project created');
    return project;
  }

  async updateProject(id: string, userId: string, data: { name?: string; description?: string; status?: string }): Promise<Project | null> {
    const existing = await this.getProject(id, userId);
    if (!existing) return null;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      values.push(id);
      this.db.run(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, ...values);
    }

    const project = await this.getProject(id, userId);
    this.events.emit('project:updated', { userId, project });
    return project;
  }

  async deleteProject(id: string, userId: string): Promise<boolean> {
    const existing = await this.getProject(id, userId);
    if (!existing) return false;

    this.db.run('DELETE FROM tasks WHERE project_id = ?', id);
    this.db.run('DELETE FROM projects WHERE id = ?', id);
    this.events.emit('project:deleted', { userId, projectId: id });
    log.info({ userId, projectId: id }, 'Project deleted');
    return true;
  }

  async getProjectStats(userId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    totalTasks: number;
    tasksByStatus: Record<string, number>;
  }> {
    const total = this.db.get<any>(
      'SELECT COUNT(*) as count FROM projects WHERE user_id = ?', userId,
    );

    const byStatus = this.db.all<any>(
      'SELECT status, COUNT(*) as count FROM projects WHERE user_id = ? GROUP BY status', userId,
    );

    const totalTasks = this.db.get<any>(
      `SELECT COUNT(*) as count FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE p.user_id = ?`, userId,
    );

    const tasksByStatus = this.db.all<any>(
      `SELECT t.status, COUNT(*) as count FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE p.user_id = ?
       GROUP BY t.status`, userId,
    );

    return {
      total: total.count,
      byStatus: Object.fromEntries(byStatus.map((r: any) => [r.status, r.count])),
      totalTasks: totalTasks.count,
      tasksByStatus: Object.fromEntries(tasksByStatus.map((r: any) => [r.status, r.count])),
    };
  }

  async listTasks(projectId: string, userId: string): Promise<Task[]> {
    const project = this.db.get<any>(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      projectId, userId,
    );
    if (!project) return [];

    const rows = this.db.all<any>(
      'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC',
      projectId,
    );
    return rows.map(this.mapTask);
  }

  async getTask(id: string, projectId: string): Promise<Task | null> {
    const row = this.db.get<any>(
      'SELECT * FROM tasks WHERE id = ? AND project_id = ?',
      id, projectId,
    );
    return row ? this.mapTask(row) : null;
  }

  async createTask(projectId: string, userId: string, data: { title: string; description?: string; status?: string; assigneeId?: string }): Promise<Task | null> {
    const project = this.db.get<any>(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      projectId, userId,
    );
    if (!project) return null;

    const id = generateId();
    this.db.run(
      'INSERT INTO tasks (id, project_id, title, description, status, assignee_id) VALUES (?, ?, ?, ?, ?, ?)',
      id, projectId, data.title, data.description || null, data.status || 'todo', data.assigneeId || null,
    );

    this.db.run("UPDATE projects SET updated_at = datetime('now') WHERE id = ?", projectId);

    const task = await this.getTask(id, projectId);
    this.events.emit('task:created', { projectId, task });
    log.info({ projectId, taskId: id }, 'Task created');
    return task;
  }

  async updateTask(id: string, projectId: string, data: { title?: string; description?: string; status?: string; assigneeId?: string }): Promise<Task | null> {
    const existing = await this.getTask(id, projectId);
    if (!existing) return null;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.assigneeId !== undefined) { fields.push('assignee_id = ?'); values.push(data.assigneeId); }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      values.push(id);
      this.db.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, ...values);
    }

    this.db.run("UPDATE projects SET updated_at = datetime('now') WHERE id = ?", projectId);

    return this.getTask(id, projectId);
  }

  async deleteTask(id: string, projectId: string): Promise<boolean> {
    const existing = await this.getTask(id, projectId);
    if (!existing) return false;

    this.db.run('DELETE FROM tasks WHERE id = ?', id);
    this.db.run("UPDATE projects SET updated_at = datetime('now') WHERE id = ?", projectId);
    this.events.emit('task:deleted', { projectId, taskId: id });
    return true;
  }

  // ── .vestara Sync Methods ──────────────────────

  async syncToVestara(projectId: string, userId: string): Promise<{ success: boolean; path?: string; error?: string }> {
    const project = await this.getProject(projectId, userId);
    if (!project) return { success: false, error: 'Project not found' };
    if (!project.path) return { success: false, error: 'Project has no path configured' };

    const vestaraDir = join(project.path, '.vestara');
    if (!existsSync(vestaraDir)) {
      mkdirSync(vestaraDir, { recursive: true });
    }

    // 1. Write config.json
    const config = {
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      syncedAt: new Date().toISOString(),
    };
    writeFileSync(join(vestaraDir, 'config.json'), JSON.stringify(config, null, 2));

    // 2. Write tasks.json
    const tasks = this.db.all<any>(
      'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC',
      projectId,
    );
    writeFileSync(join(vestaraDir, 'tasks.json'), JSON.stringify(tasks, null, 2));

    // 3. Write conversations.json (AI chat history linked to this project)
    const conversations = this.db.all<any>(
      'SELECT * FROM conversations WHERE project_id = ? ORDER BY updated_at DESC',
      projectId,
    );
    const conversationsWithMessages = conversations.map(conv => {
      const messages = this.db.all<any>(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
        conv.id,
      );
      return { ...conv, messages };
    });
    writeFileSync(join(vestaraDir, 'conversations.json'), JSON.stringify(conversationsWithMessages, null, 2));

    // 4. Write opencode.json (OpenCode sessions linked to this project)
    const opencodeChats = this.db.all<any>(
      'SELECT * FROM opencode_chats WHERE project_id = ? ORDER BY updated_at DESC',
      projectId,
    );
    const opencodeWithMessages = opencodeChats.map(chat => {
      const messages = this.db.all<any>(
        'SELECT * FROM opencode_messages WHERE chat_id = ? ORDER BY created_at ASC',
        chat.id,
      );
      return { ...chat, messages };
    });
    writeFileSync(join(vestaraDir, 'opencode.json'), JSON.stringify(opencodeWithMessages, null, 2));

    log.info({ projectId, path: vestaraDir }, 'Synced to .vestara');
    return { success: true, path: vestaraDir };
  }

  async getVestaraConfig(projectId: string, userId: string): Promise<any> {
    const project = await this.getProject(projectId, userId);
    if (!project || !project.path) return null;

    const configPath = join(project.path, '.vestara', 'config.json');
    if (!existsSync(configPath)) return null;

    try {
      return JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch {
      return null;
    }
  }

  async importFromVestara(projectId: string, userId: string): Promise<{ success: boolean; imported?: { tasks: number; conversations: number; opencodeChats: number }; error?: string }> {
    const project = await this.getProject(projectId, userId);
    if (!project) return { success: false, error: 'Project not found' };
    if (!project.path) return { success: false, error: 'Project has no path configured' };

    const vestaraDir = join(project.path, '.vestara');
    if (!existsSync(vestaraDir)) return { success: false, error: '.vestara directory not found' };

    let tasksImported = 0;
    let conversationsImported = 0;
    let opencodeChatsImported = 0;

    // 1. Import tasks.json
    const tasksPath = join(vestaraDir, 'tasks.json');
    if (existsSync(tasksPath)) {
      try {
        const tasks = JSON.parse(readFileSync(tasksPath, 'utf-8'));
        for (const task of tasks) {
          const existing = this.db.get<any>('SELECT id FROM tasks WHERE id = ?', task.id);
          if (!existing) {
            this.db.run(
              'INSERT INTO tasks (id, project_id, title, description, status, assignee_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              task.id, projectId, task.title, task.description, task.status, task.assignee_id, task.created_at, task.updated_at,
            );
            tasksImported++;
          }
        }
      } catch (err) {
        log.warn({ projectId }, 'Failed to import tasks.json');
      }
    }

    // 2. Import conversations.json
    const convPath = join(vestaraDir, 'conversations.json');
    if (existsSync(convPath)) {
      try {
        const conversations = JSON.parse(readFileSync(convPath, 'utf-8'));
        for (const conv of conversations) {
          const existing = this.db.get<any>('SELECT id FROM conversations WHERE id = ?', conv.id);
          if (!existing) {
            this.db.run(
              'INSERT INTO conversations (id, user_id, project_id, title, model_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
              conv.id, userId, projectId, conv.title, conv.model_id, conv.created_at, conv.updated_at,
            );
            conversationsImported++;
          }
          // Import messages
          if (conv.messages) {
            for (const msg of conv.messages) {
              const msgExists = this.db.get<any>('SELECT id FROM messages WHERE id = ?', msg.id);
              if (!msgExists) {
                this.db.run(
                  'INSERT INTO messages (id, conversation_id, role, content, tokens, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                  msg.id, conv.id, msg.role, msg.content, msg.tokens || null, msg.created_at,
                );
              }
            }
          }
        }
      } catch (err) {
        log.warn({ projectId }, 'Failed to import conversations.json');
      }
    }

    // 3. Import opencode.json
    const ocPath = join(vestaraDir, 'opencode.json');
    if (existsSync(ocPath)) {
      try {
        const opencodeChats = JSON.parse(readFileSync(ocPath, 'utf-8'));
        for (const chat of opencodeChats) {
          const existing = this.db.get<any>('SELECT id FROM opencode_chats WHERE id = ?', chat.id);
          if (!existing) {
            this.db.run(
              'INSERT INTO opencode_chats (id, project_id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
              chat.id, projectId, chat.title, chat.model, chat.created_at, chat.updated_at,
            );
            opencodeChatsImported++;
          }
          // Import messages
          if (chat.messages) {
            for (const msg of chat.messages) {
              const msgExists = this.db.get<any>('SELECT id FROM opencode_messages WHERE id = ?', msg.id);
              if (!msgExists) {
                this.db.run(
                  'INSERT INTO opencode_messages (id, chat_id, role, content, model, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                  msg.id, chat.id, msg.role, msg.content, msg.model || null, msg.created_at,
                );
              }
            }
          }
        }
      } catch (err) {
        log.warn({ projectId }, 'Failed to import opencode.json');
      }
    }

    log.info({ projectId, tasksImported, conversationsImported, opencodeChatsImported }, 'Imported from .vestara');
    return {
      success: true,
      imported: {
        tasks: tasksImported,
        conversations: conversationsImported,
        opencodeChats: opencodeChatsImported,
      },
    };
  }

  private mapProject(row: any): Project {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      status: row.status,
      path: row.path,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapTask(row: any): Task {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      description: row.description,
      status: row.status,
      assigneeId: row.assignee_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
