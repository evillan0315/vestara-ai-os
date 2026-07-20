import type { Database } from './db.js';
import type { EventBus } from './events.js';
import { createLogger } from './logger.js';
import { generateId } from '@vestara/utils';

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
