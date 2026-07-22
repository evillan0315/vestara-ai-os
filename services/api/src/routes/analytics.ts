import type { VestaraApp } from '../types.js';
import { authMiddleware } from './auth.js';
import { ProjectAnalyticsService } from '@vestara/core';

export function registerAnalyticsRoutes(app: VestaraApp) {
  const analyticsService = new ProjectAnalyticsService(app.db, app.events, app.projectService);

  // ── Project Analytics ──────────────────────────────

  app.get('/api/analytics/projects/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request as any).userId;
      const insights = await analyticsService.analyzeProject(id, userId);
      return { insights };
    } catch (error) {
      return reply.status(404).send({ 
        error: error instanceof Error ? error.message : 'Failed to analyze project' 
      });
    }
  });

  app.get('/api/analytics/projects', {
    preHandler: [authMiddleware],
  }, async (request) => {
    const userId = (request as any).userId;
    const snapshot = await analyticsService.analyzeAllProjects(userId);
    return { snapshot };
  });

  app.get('/api/analytics/team', {
    preHandler: [authMiddleware],
  }, async (request) => {
    const userId = (request as any).userId;
    const teamInsights = await analyticsService.getTeamInsights(userId);
    return { teamInsights };
  });

  // ── Analytics Health ──────────────────────────────

  app.get('/api/analytics/health', {
    preHandler: [authMiddleware],
  }, async (request) => {
    const userId = (request as any).userId;
    const projects = await app.projectService.listProjects(userId);
    const allTasks = await app.projectService.listTasks('', userId);
    
    const healthyProjects = projects.filter(p => p.status === 'active' && p.path);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'done').length;
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: {
        totalProjects: projects.length,
        activeProjects: healthyProjects.length,
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      }
    };
  });
}
