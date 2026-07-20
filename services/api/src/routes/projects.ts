import type { VestaraApp } from '../types.js';
import { authMiddleware } from './auth.js';
import { generateId } from '@vestara/utils';

interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: string;
  path: string | null;
  created_at: string;
  updated_at: string;
}

export function registerProjectRoutes(app: VestaraApp) {
  app.get('/api/projects', {
    preHandler: [authMiddleware],
  }, async (request) => {
    const userId = (request as any).userId;
    const projects = app.db.all<ProjectRow>(
      'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
      userId,
    );
    return { projects };
  });

  app.post<{
    Body: { name: string; description?: string; path?: string };
  }>('/api/projects', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const userId = (request as any).userId;
    const { name, description, path } = request.body;
    const id = generateId();

    app.db.run(
      'INSERT INTO projects (id, user_id, name, description, path) VALUES (?, ?, ?, ?, ?)',
      id, userId, name, description || null, path || null,
    );

    const project = app.db.get<ProjectRow>('SELECT * FROM projects WHERE id = ?', id);
    return reply.status(201).send({ project });
  });

  app.patch<{
    Params: { id: string };
    Body: { name?: string; description?: string; status?: string };
  }>('/api/projects/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;
    const updates = request.body;

    const existing = app.db.get<ProjectRow>(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      id, userId,
    );
    if (!existing) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }

    if (fields.length > 0) {
      fields.push('updated_at = datetime(\'now\')');
      values.push(id);
      app.db.run(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, ...values);
    }

    return { message: 'Project updated' };
  });

  app.delete<{
    Params: { id: string };
  }>('/api/projects/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;

    const existing = app.db.get<ProjectRow>(
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
}
