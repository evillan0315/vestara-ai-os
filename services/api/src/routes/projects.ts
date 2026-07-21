import type { VestaraApp } from '../types.js';
import { authMiddleware } from './auth.js';
import { createProjectSchema, updateProjectSchema, createTaskSchema, updateTaskSchema, bulkUpdateTasksSchema, cloneProjectSchema } from '@vestara/validation';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function registerProjectRoutes(app: VestaraApp) {
  const ps = app.projectService;

  // ── Project CRUD ─────────────────────────────

  app.get('/api/projects', {
    preHandler: [authMiddleware],
  }, async (request) => {
    const userId = (request as any).userId;
    const projects = await ps.listProjects(userId);
    return { projects };
  });

  app.get('/api/projects/stats', {
    preHandler: [authMiddleware],
  }, async (request) => {
    const userId = (request as any).userId;
    const stats = await ps.getProjectStats(userId);
    return stats;
  });

  app.post('/api/projects', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const userId = (request as any).userId;
    const parsed = createProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    const project = await ps.createProject(userId, parsed.data);
    return reply.status(201).send({ project });
  });

  app.patch<{ Params: { id: string } }>('/api/projects/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;

    const parsed = updateProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const project = await ps.updateProject(id, userId, parsed.data);
    if (!project) return reply.status(404).send({ error: 'Project not found' });
    return { project };
  });

  app.delete<{ Params: { id: string } }>('/api/projects/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;
    const deleted = await ps.deleteProject(id, userId);
    if (!deleted) return reply.status(404).send({ error: 'Project not found' });
    return { message: 'Project deleted' };
  });

  // ── Clone ────────────────────────────────────

  app.post<{ Params: { id: string } }>('/api/projects/:id/clone', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;
    const parsed = cloneProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    const project = await ps.cloneProject(id, userId, parsed.data);
    if (!project) return reply.status(404).send({ error: 'Project not found' });
    return reply.status(201).send({ project });
  });

  // ── Activity ─────────────────────────────────

  app.get<{ Params: { id: string } }>('/api/projects/:id/activity', {
    preHandler: [authMiddleware],
  }, async (request) => {
    const { id } = request.params;
    const activity = await ps.getProjectActivity(id);
    return { activity };
  });

  // ── Archive to .vestara ──────────────────────

  app.post<{ Params: { id: string } }>('/api/projects/:id/archive', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;
    const result = await ps.archiveToVestara(id, userId);
    if (!result.success) {
      return reply.status(400).send(result);
    }
    return result;
  });

  // ── Task Routes ─────────────────────────────

  app.get<{ Params: { id: string } }>('/api/projects/:id/tasks', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;
    const tasks = await ps.listTasks(id, userId);
    return { tasks };
  });

  app.get<{ Params: { id: string; taskId: string } }>('/api/projects/:id/tasks/:taskId', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id, taskId } = request.params;
    const task = await ps.getTask(taskId, id);
    if (!task) return reply.status(404).send({ error: 'Task not found' });
    return { task };
  });

  app.post<{ Params: { id: string } }>('/api/projects/:id/tasks', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;
    const parsed = createTaskSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    const task = await ps.createTask(id, userId, parsed.data);
    if (!task) return reply.status(404).send({ error: 'Project not found' });
    return reply.status(201).send({ task });
  });

  app.patch<{ Params: { id: string; taskId: string } }>('/api/projects/:id/tasks/:taskId', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id, taskId } = request.params;
    const parsed = updateTaskSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    const task = await ps.updateTask(taskId, id, parsed.data);
    if (!task) return reply.status(404).send({ error: 'Task not found' });
    return { task };
  });

  app.delete<{ Params: { id: string; taskId: string } }>('/api/projects/:id/tasks/:taskId', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id, taskId } = request.params;
    const deleted = await ps.deleteTask(taskId, id);
    if (!deleted) return reply.status(404).send({ error: 'Task not found' });
    return { message: 'Task deleted' };
  });

  // ── Bulk Task Update ─────────────────────────

  app.post<{ Params: { id: string } }>('/api/projects/:id/tasks/bulk', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const parsed = bulkUpdateTasksSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    const { ids, ...data } = parsed.data;
    const ok = await ps.bulkUpdateTasks(id, ids, data);
    if (!ok) return reply.status(404).send({ error: 'Project not found' });
    return { success: true, updated: ids.length };
  });

  // ── Sub-tasks ────────────────────────────────

  app.get<{ Params: { id: string; taskId: string } }>('/api/projects/:id/tasks/:taskId/subtasks', {
    preHandler: [authMiddleware],
  }, async (request) => {
    const { id, taskId } = request.params;
    const subtasks = await ps.getSubTasks(id, taskId);
    return { subtasks };
  });

  // ── .vestara Sync Routes ──────────────────────

  app.post<{ Params: { id: string } }>('/api/projects/:id/sync', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;
    const result = await ps.syncToVestara(id, userId);
    return result.success ? result : reply.status(400).send(result);
  });

  app.get<{ Params: { id: string } }>('/api/projects/:id/vestara', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;

    const project = await ps.getProject(id, userId);
    if (!project) return reply.status(404).send({ error: 'Project not found' });
    if (!project.path) return reply.status(400).send({ error: 'Project has no path configured' });

    const vestaraDir = join(project.path, '.vestara');
    if (!existsSync(vestaraDir)) return { exists: false };

    const configPath = join(vestaraDir, 'config.json');
    const tasksPath = join(vestaraDir, 'tasks.json');
    const convPath = join(vestaraDir, 'conversations.json');
    const ocPath = join(vestaraDir, 'opencode.json');

    let config = null;
    let taskCount = 0;
    let conversationCount = 0;
    let opencodeChatCount = 0;

    try {
      if (existsSync(configPath)) config = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (existsSync(tasksPath)) taskCount = JSON.parse(readFileSync(tasksPath, 'utf-8')).length;
      if (existsSync(convPath)) conversationCount = JSON.parse(readFileSync(convPath, 'utf-8')).length;
      if (existsSync(ocPath)) opencodeChatCount = JSON.parse(readFileSync(ocPath, 'utf-8')).length;
    } catch {}

    return {
      exists: true,
      config,
      stats: { tasks: taskCount, conversations: conversationCount, opencodeChats: opencodeChatCount },
    };
  });

  app.post<{ Params: { id: string } }>('/api/projects/:id/import', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;
    const result = await ps.importFromVestara(id, userId);
    return result.success ? result : reply.status(400).send(result);
  });
}
