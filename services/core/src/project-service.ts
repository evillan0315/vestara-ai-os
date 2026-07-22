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
  parentId: string | null;
  tags: string[];
  estimatedHours: number | null;
  loggedHours: number;
  sortOrder: number;
  dueDate: string | null;
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
    await this.logActivity(userId, 'project:created', `project:${id}`, { name: data.name });
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
    await this.logActivity(userId, 'project:updated', `project:${id}`, { changes: data });
    return project;
  }

  async deleteProject(id: string, userId: string): Promise<boolean> {
    const existing = await this.getProject(id, userId);
    if (!existing) return false;

    this.db.run('DELETE FROM tasks WHERE project_id = ?', id);
    this.db.run('DELETE FROM projects WHERE id = ?', id);
    this.events.emit('project:deleted', { userId, projectId: id });
    await this.logActivity(userId, 'project:deleted', `project:${id}`);
    log.info({ userId, projectId: id }, 'Project deleted');
    return true;
  }

  async cloneProject(id: string, userId: string, data: { name: string; includeTasks?: boolean; includeConversations?: boolean; includeOpenCodeChats?: boolean }): Promise<Project | null> {
    const original = await this.getProject(id, userId);
    if (!original) return null;

    const newId = generateId();
    this.db.run(
      'INSERT INTO projects (id, user_id, name, description, path, status) VALUES (?, ?, ?, ?, ?, ?)',
      newId, userId, data.name, original.description, null, 'active',
    );

    if (data.includeTasks !== false) {
      const tasks = this.db.all<any>('SELECT * FROM tasks WHERE project_id = ?', id);
      for (const task of tasks) {
        const newTaskId = generateId();
        this.db.run(
          'INSERT INTO tasks (id, project_id, title, description, status, assignee_id, parent_id, tags, estimated_hours, logged_hours, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
          newTaskId, newId, task.title, task.description, task.status, null, null, task.tags || '[]', task.estimated_hours, 0, task.sort_order || 0,
        );
      }
    }

    if (data.includeConversations) {
      const conversations = this.db.all<any>('SELECT * FROM conversations WHERE project_id = ?', id);
      for (const conv of conversations) {
        const newConvId = generateId();
        this.db.run(
          'INSERT INTO conversations (id, user_id, project_id, title, model_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
          newConvId, userId, newId, `${conv.title} (copy)`, conv.model_id,
        );
        const messages = this.db.all<any>('SELECT * FROM messages WHERE conversation_id = ?', conv.id);
        for (const msg of messages) {
          this.db.run(
            'INSERT INTO messages (id, conversation_id, role, content, tokens, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            generateId(), newConvId, msg.role, msg.content, msg.tokens, msg.created_at,
          );
        }
      }
    }

    if (data.includeOpenCodeChats) {
      const chats = this.db.all<any>('SELECT * FROM opencode_chats WHERE project_id = ?', id);
      for (const chat of chats) {
        const newChatId = generateId();
        this.db.run(
          'INSERT INTO opencode_chats (id, project_id, title, model, cwd, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
          newChatId, newId, `${chat.title} (copy)`, chat.model, chat.cwd,
        );
        const messages = this.db.all<any>('SELECT * FROM opencode_messages WHERE chat_id = ?', chat.id);
        for (const msg of messages) {
          this.db.run(
            'INSERT INTO opencode_messages (id, chat_id, role, content, model, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            generateId(), newChatId, msg.role, msg.content, msg.model, msg.created_at,
          );
        }
      }
    }

    const row = this.db.get<any>('SELECT * FROM projects WHERE id = ?', newId);
    const project = this.mapProject(row);
    this.events.emit('project:created', { userId, project });
    await this.logActivity(userId, 'project:cloned', `project:${newId}`, { sourceId: id, name: data.name });
    log.info({ userId, projectId: newId, sourceId: id }, 'Project cloned');
    return project;
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
      'SELECT * FROM tasks WHERE project_id = ? ORDER BY sort_order ASC, created_at ASC',
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

  async getSubTasks(projectId: string, parentTaskId: string): Promise<Task[]> {
    const rows = this.db.all<any>(
      'SELECT * FROM tasks WHERE project_id = ? AND parent_id = ? ORDER BY sort_order ASC, created_at ASC',
      projectId, parentTaskId,
    );
    return rows.map(this.mapTask);
  }

  async createTask(projectId: string, userId: string, data: {
    title: string; description?: string; status?: string; assigneeId?: string;
    parentId?: string; tags?: string[]; estimatedHours?: number; dueDate?: string;
  }): Promise<Task | null> {
    const project = this.db.get<any>(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      projectId, userId,
    );
    if (!project) return null;

    const id = generateId();
    const tags = data.tags ? JSON.stringify(data.tags) : '[]';
    this.db.run(
      'INSERT INTO tasks (id, project_id, title, description, status, assignee_id, parent_id, tags, estimated_hours, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id, projectId, data.title, data.description || null, data.status || 'todo', data.assigneeId || null, data.parentId || null, tags, data.estimatedHours || null, data.dueDate || null,
    );

    this.db.run("UPDATE projects SET updated_at = datetime('now') WHERE id = ?", projectId);

    const task = await this.getTask(id, projectId);
    this.events.emit('task:created', { projectId, task });
    await this.logActivity(userId, 'task:created', `task:${id}`, { projectId, title: data.title });

    if (data.assigneeId && data.assigneeId !== userId) {
      await this.createNotification(data.assigneeId, 'task:assigned', `You were assigned to task "${data.title}"`, { taskId: id, projectId });
    }

    log.info({ projectId, taskId: id }, 'Task created');
    return task;
  }

  async updateTask(id: string, projectId: string, data: {
    title?: string; description?: string; status?: string; assigneeId?: string;
    parentId?: string; tags?: string[]; estimatedHours?: number;
    loggedHours?: number; sortOrder?: number;
  }): Promise<Task | null> {
    const existing = await this.getTask(id, projectId);
    if (!existing) return null;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.assigneeId !== undefined) { fields.push('assignee_id = ?'); values.push(data.assigneeId); }
    if (data.parentId !== undefined) { fields.push('parent_id = ?'); values.push(data.parentId); }
    if (data.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    if (data.estimatedHours !== undefined) { fields.push('estimated_hours = ?'); values.push(data.estimatedHours); }
    if (data.loggedHours !== undefined) { fields.push('logged_hours = ?'); values.push(data.loggedHours); }
    if (data.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(data.sortOrder); }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      values.push(id);
      this.db.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, ...values);
    }

    this.db.run("UPDATE projects SET updated_at = datetime('now') WHERE id = ?", projectId);

    if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId && data.assigneeId) {
      await this.createNotification(data.assigneeId, 'task:assigned', `You were assigned to task "${data.title || existing.title}"`, { taskId: id, projectId });
    }

    return this.getTask(id, projectId);
  }

  async bulkUpdateTasks(projectId: string, ids: string[], data: { status?: string; assigneeId?: string | null; tags?: string[] }): Promise<boolean> {
    const placeholders = ids.map(() => '?').join(',');
    if (data.status !== undefined) {
      this.db.run(`UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id IN (${placeholders}) AND project_id = ?`, data.status, ...ids, projectId);
    }
    if (data.assigneeId !== undefined) {
      const assignee = data.assigneeId || null;
      this.db.run(`UPDATE tasks SET assignee_id = ?, updated_at = datetime('now') WHERE id IN (${placeholders}) AND project_id = ?`, assignee, ...ids, projectId);
    }
    if (data.tags !== undefined) {
      const tags = JSON.stringify(data.tags);
      this.db.run(`UPDATE tasks SET tags = ?, updated_at = datetime('now') WHERE id IN (${placeholders}) AND project_id = ?`, tags, ...ids, projectId);
    }
    this.db.run("UPDATE projects SET updated_at = datetime('now') WHERE id = ?", projectId);
    return true;
  }

  async deleteTask(id: string, projectId: string): Promise<boolean> {
    const existing = await this.getTask(id, projectId);
    if (!existing) return false;

    this.db.run('UPDATE tasks SET parent_id = NULL WHERE parent_id = ?', id);
    this.db.run('DELETE FROM tasks WHERE id = ?', id);
    this.db.run("UPDATE projects SET updated_at = datetime('now') WHERE id = ?", projectId);
    this.events.emit('task:deleted', { projectId, taskId: id });
    return true;
  }

  async logActivity(userId: string, action: string, resource: string, metadata?: Record<string, unknown>): Promise<void> {
    const id = generateId();
    this.db.run(
      'INSERT INTO activity_log (id, user_id, action, resource, metadata) VALUES (?, ?, ?, ?, ?)',
      id, userId, action, resource, metadata ? JSON.stringify(metadata) : '{}',
    );
  }

  async getProjectActivity(projectId: string, limit = 50): Promise<any[]> {
    const rows = this.db.all<any>(
      `SELECT al.* FROM activity_log al
       JOIN projects p ON p.user_id = al.user_id
       WHERE p.id = ?
       ORDER BY al.created_at DESC LIMIT ?`,
      projectId, limit,
    );
    return rows.map((r: any) => ({
      ...r,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
    }));
  }

  async createNotification(userId: string, type: string, title: string, metadata?: Record<string, unknown>, priority = 'medium'): Promise<void> {
    const id = generateId();
    this.db.run(
      'INSERT INTO notifications (id, user_id, type, priority, title, message, read) VALUES (?, ?, ?, ?, ?, ?, 0)',
      id, userId, type, priority, title, metadata ? JSON.stringify(metadata) : '{}',
    );
    this.events.emit('notification:new', { userId, type, title, metadata });
  }

  async archiveToVestara(projectId: string, userId: string): Promise<{ success: boolean; path?: string; error?: string }> {
    const result = await this.syncToVestara(projectId, userId);
    if (!result.success) return result;

    this.db.run("UPDATE projects SET status = 'archived', updated_at = datetime('now') WHERE id = ?", projectId);
    await this.logActivity(userId, 'project:archived', `project:${projectId}`);
    log.info({ projectId }, 'Project archived to .vestara');
    return result;
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

    const config = {
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      syncedAt: new Date().toISOString(),
    };
    writeFileSync(join(vestaraDir, 'config.json'), JSON.stringify(config, null, 2));

    const tasks = this.db.all<any>(
      'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC',
      projectId,
    );
    writeFileSync(join(vestaraDir, 'tasks.json'), JSON.stringify(tasks, null, 2));

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

    await this.logActivity(userId, 'project:synced', `project:${projectId}`, { path: vestaraDir });
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

    const tasksPath = join(vestaraDir, 'tasks.json');
    if (existsSync(tasksPath)) {
      try {
        const tasks = JSON.parse(readFileSync(tasksPath, 'utf-8'));
        for (const task of tasks) {
          const existing = this.db.get<any>('SELECT id FROM tasks WHERE id = ?', task.id);
          if (!existing) {
            this.db.run(
              'INSERT INTO tasks (id, project_id, title, description, status, assignee_id, parent_id, tags, estimated_hours, logged_hours, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              task.id, projectId, task.title, task.description, task.status, task.assignee_id, task.parent_id, task.tags || '[]', task.estimated_hours, task.logged_hours || 0, task.sort_order || 0, task.created_at, task.updated_at,
            );
            tasksImported++;
          }
        }
      } catch (err) {
        log.warn({ projectId }, 'Failed to import tasks.json');
      }
    }

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

    await this.logActivity(userId, 'project:imported', `project:${projectId}`, { tasksImported, conversationsImported, opencodeChatsImported });
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
      parentId: row.parent_id,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : (row.tags || []),
      estimatedHours: row.estimated_hours,
      loggedHours: row.logged_hours || 0,
      sortOrder: row.sort_order || 0,
      dueDate: row.due_date || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
