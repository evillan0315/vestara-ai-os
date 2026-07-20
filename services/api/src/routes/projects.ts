import type { VestaraApp } from '../types.js';
import { authMiddleware } from './auth.js';
import { createProjectSchema, updateProjectSchema, createTaskSchema, updateTaskSchema } from '@vestara/validation';
import { generateId } from '@vestara/utils';

export function registerProjectRoutes(app: VestaraApp) {
  app.get('/api/projects', {
    preHandler: [authMiddleware],
  }, async (request) => {
    const userId = (request as any).userId;
    const projects = app.db.all<any>(
      'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
      userId,
    );
    return { projects };
  });

  app.get('/api/projects/stats', {
    preHandler: [authMiddleware],
  }, async (request) => {
    const userId = (request as any).userId;

    const total = app.db.get<any>(
      'SELECT COUNT(*) as count FROM projects WHERE user_id = ?', userId,
    );
    const byStatus = app.db.all<any>(
      'SELECT status, COUNT(*) as count FROM projects WHERE user_id = ? GROUP BY status', userId,
    );
    const totalTasks = app.db.get<any>(
      `SELECT COUNT(*) as count FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE p.user_id = ?`, userId,
    );
    const tasksByStatus = app.db.all<any>(
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
  });

  app.post('/api/projects', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const userId = (request as any).userId;
    const parsed = createProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    const { name, description, path } = parsed.data;
    const id = generateId();

    app.db.run(
      'INSERT INTO projects (id, user_id, name, description, path) VALUES (?, ?, ?, ?, ?)',
      id, userId, name, description || null, path || null,
    );

    const project = app.db.get<any>('SELECT * FROM projects WHERE id = ?', id);
    return reply.status(201).send({ project });
  });

  app.patch<{
    Params: { id: string };
  }>('/api/projects/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;

    const parsed = updateProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const existing = app.db.get<any>(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      id, userId,
    );
    if (!existing) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const updates = parsed.data;
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      values.push(id);
      app.db.run(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, ...values);
    }

    const project = app.db.get<any>('SELECT * FROM projects WHERE id = ?', id);
    return { project };
  });

  app.delete<{
    Params: { id: string };
  }>('/api/projects/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;

    const existing = app.db.get<any>(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      id, userId,
    );
    if (!existing) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    app.db.run('DELETE FROM tasks WHERE project_id = ?', id);
    app.db.run('DELETE FROM projects WHERE id = ?', id);
    return { message: 'Project deleted' };
  });

  // ── Task Routes ─────────────────────────────

  app.get<{
    Params: { id: string };
  }>('/api/projects/:id/tasks', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;

    const project = app.db.get<any>(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      id, userId,
    );
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const tasks = app.db.all<any>(
      'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC',
      id,
    );
    return { tasks };
  });

  app.post<{
    Params: { id: string };
  }>('/api/projects/:id/tasks', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;

    const project = app.db.get<any>(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      id, userId,
    );
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const parsed = createTaskSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const { title, description, status, assigneeId } = parsed.data;
    const taskId = generateId();

    app.db.run(
      'INSERT INTO tasks (id, project_id, title, description, status, assignee_id) VALUES (?, ?, ?, ?, ?, ?)',
      taskId, id, title, description || null, status || 'todo', assigneeId || null,
    );

    app.db.run("UPDATE projects SET updated_at = datetime('now') WHERE id = ?", id);

    const task = app.db.get<any>('SELECT * FROM tasks WHERE id = ?', taskId);
    return reply.status(201).send({ task });
  });

  app.patch<{
    Params: { id: string; taskId: string };
  }>('/api/projects/:id/tasks/:taskId', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id, taskId } = request.params;
    const userId = (request as any).userId;

    const project = app.db.get<any>(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      id, userId,
    );
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const existing = app.db.get<any>(
      'SELECT * FROM tasks WHERE id = ? AND project_id = ?',
      taskId, id,
    );
    if (!existing) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const parsed = updateTaskSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const updates = parsed.data;
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.assigneeId !== undefined) { fields.push('assignee_id = ?'); values.push(updates.assigneeId); }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      values.push(taskId);
      app.db.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, ...values);
    }

    app.db.run("UPDATE projects SET updated_at = datetime('now') WHERE id = ?", id);

    const task = app.db.get<any>('SELECT * FROM tasks WHERE id = ?', taskId);
    return { task };
  });

  app.delete<{
    Params: { id: string; taskId: string };
  }>('/api/projects/:id/tasks/:taskId', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id, taskId } = request.params;
    const userId = (request as any).userId;

    const project = app.db.get<any>(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      id, userId,
    );
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const existing = app.db.get<any>(
      'SELECT * FROM tasks WHERE id = ? AND project_id = ?',
      taskId, id,
    );
    if (!existing) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    app.db.run('DELETE FROM tasks WHERE id = ?', taskId);
    app.db.run("UPDATE projects SET updated_at = datetime('now') WHERE id = ?", id);
    return { message: 'Task deleted' };
  });
}
