// ──────────────────────────────────────────────
// Project Analytics Service - AI-Powered Insights
// ──────────────────────────────────────────────

import type { Database } from './db.js';
import type { EventBus } from './events.js';
import { createLogger } from './logger.js';
import type { Project } from './project-service.js';
import type { Task } from './project-service.js';
import type { AgentExecution } from '@vestara/types';
import type { Memory } from './memory-service.js';
import { generateId } from '@vestara/utils';
import { ProjectService } from './project-service.js';

import {
  type ExtendedAgentExecution,
  type ProjectHealthScore,
  type TeamPerformance,
  type AgentPerformance,
  type TaskPerformance,
  type ProjectInsights,
  type AnalyticsSnapshot,
  type ProjectMetrics,
  type TrendData,
  type Alert,
  type TeamInsights
} from './project-analytics-types.js';

import {
  calculateTrendDirection,
  calculateWorkloadBalance,
  getUniqueAgentIds,
  analyzeSkillDistribution,
  analyzeProductivityTrends,
  analyzeTimeToComplete,
  analyzeWorkloadDistribution,
  calculateProjectHealthScore,
  calculateTeamPerformance,
  generateRecommendations,
  identifyRisks,
  suggestNextSteps,
  calculateTrends,
  generateAlerts,
  getAllTasksForUser,
  getAllAgentExecutions
} from './project-analytics-helpers.js';

import {
  mapTask,
  mapAgentExecution,
  mapMemory,
  mapProject,
  generateAlertId
} from './project-analytics-mappers.js';

const log = createLogger('project-analytics');

export class ProjectAnalyticsService {
  private db: Database;
  private events: EventBus;
  private projectService: ProjectService;

  constructor(db: Database, events: EventBus, projectService: ProjectService) {
    this.db = db;
    this.events = events;
    this.projectService = projectService;
  }

  // Core analytics methods
  async analyzeProject(projectId: string, userId: string): Promise<ProjectInsights> {
    const startTime = Date.now();

    try {
      const [project, tasks, agentExecutions, memories] = await Promise.all([
        this.projectService.getProject(projectId, userId),
        this.getProjectTasks(projectId, userId),
        this.getAgentExecutions(projectId, userId),
        this.getProjectMemories(userId)
      ]);

      if (!project) {
        throw new Error('Project not found');
      }

      const healthScore = await this.calculateProjectHealthScore(project, tasks);
      const teamPerformance = await this.calculateTeamPerformance(tasks, agentExecutions);
      const recommendations = await this.generateRecommendations(project, tasks, agentExecutions);
      const risks = await this.identifyRisks(project, tasks);
      const nextSteps = await this.suggestNextSteps(project, tasks);

      const insights: ProjectInsights = {
        projectId,
        healthScore,
        teamPerformance,
        recommendations,
        risks,
        nextSteps
      };

      this.events.emit('analytics:generated', {
        userId,
        projectId,
        insights,
        duration: Date.now() - startTime
      });

      log.info({ projectId, userId, score: healthScore.overall }, 'Project analysis completed');
      return insights;

    } catch (error) {
      log.error({ projectId, userId, error }, 'Failed to analyze project');
      throw error;
    }
  }

  async analyzeAllProjects(userId: string): Promise<AnalyticsSnapshot> {
    const startTime = Date.now();

    try {
      // Get all projects for the user
      const projects = await this.projectService.listProjects(userId);

      // Get aggregated data
      const projectsMetrics = await Promise.all(
        projects.map(project => this.calculateProjectMetrics(project.id, userId))
      );

      const trends = await this.calculateTrends(userId);
      const alerts = await this.generateAlerts(userId);

      const snapshot: AnalyticsSnapshot = {
        timestamp: new Date().toISOString(),
        projects: projectsMetrics,
        trends,
        alerts
      };

      this.events.emit('analytics:snapshot', {
        userId,
        snapshot,
        duration: Date.now() - startTime
      });

      log.info({ userId, projectCount: projects.length }, 'Analytics snapshot completed');
      return snapshot;

    } catch (error) {
      log.error({ userId, error }, 'Failed to generate analytics snapshot');
      throw error;
    }
  }

  async getTeamInsights(userId: string): Promise<TeamInsights> {
    const startTime = Date.now();

    try {
      const projects = await this.projectService.listProjects(userId);
      const allTasks = await this.getAllTasksForUser(userId);
      const allAgentExecutions = await this.getAllAgentExecutions(userId);

      const teamInsights: TeamInsights = {
        totalProjects: projects.length,
        totalTasks: allTasks.length,
        activeAgents: getUniqueAgentIds(allAgentExecutions),
        skillDistribution: await analyzeSkillDistribution(allAgentExecutions),
        productivityTrends: await analyzeProductivityTrends(userId),
        timeToComplete: await analyzeTimeToComplete(allTasks),
        workloadDistribution: await analyzeWorkloadDistribution(allTasks),
      };

      this.events.emit('analytics:team-insights', {
        userId,
        teamInsights,
        duration: Date.now() - startTime
      });

      log.info({ userId }, 'Team insights generated');
      return teamInsights;

    } catch (error) {
      log.error({ userId, error }, 'Failed to generate team insights');
      throw error;
    }
  }

  // Helper methods
  private async calculateProjectHealthScore(project: Project, tasks: Task[]): Promise<ProjectHealthScore> {
    const totalTasks = tasks.length;
    if (totalTasks === 0) {
      return {
        overall: 0,
        metrics: {
          taskCompletion: 0,
          timelineAdherence: 0,
          resourceUtilization: 0,
          riskLevel: 100
        },
        status: 'critical',
        trends: { taskCompletion: 0, timeline: 0 }
      };
    }

    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const taskCompletionRate = (completedTasks / totalTasks) * 100;

    const overdueTasks = tasks.filter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    }).length;
    const timelineAdherence = tasks.length > 0 ? (((totalTasks - overdueTasks) / totalTasks) * 100) : 100;

    const estimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const loggedHours = tasks.reduce((sum, t) => sum + (t.loggedHours || 0), 0);
    const resourceUtilization = estimatedHours > 0 ? (loggedHours / estimatedHours) * 100 : 0;

    const criticalTasks = tasks.filter(t => t.status === 'in_progress').length;
    const riskLevel = totalTasks > 0 ? (criticalTasks / totalTasks) * 100 : 0;

    const overall = (taskCompletionRate * 0.4) + (timelineAdherence * 0.3) +
                   (Math.min(resourceUtilization, 100) * 0.2) + ((100 - riskLevel) * 0.1);

    let status: ProjectHealthScore['status'];
    if (overall >= 90) status = 'excellent';
    else if (overall >= 75) status = 'good';
    else if (overall >= 50) status = 'warning';
    else status = 'critical';

    const previousCompletion = 50;
    const taskCompletionTrend = taskCompletionRate - previousCompletion;

    const previousTimeline = 80;
    const timelineTrend = timelineAdherence - previousTimeline;

    return {
      overall: Math.round(overall),
      metrics: {
        taskCompletion: Math.round(taskCompletionRate),
        timelineAdherence: Math.round(timelineAdherence),
        resourceUtilization: Math.round(Math.min(resourceUtilization, 100)),
        riskLevel: Math.round(riskLevel)
      },
      status,
      trends: {
        taskCompletion: Math.round(taskCompletionTrend),
        timeline: Math.round(timelineTrend)
      }
    };
  }

  private async calculateTeamPerformance(
    tasks: Task[],
    agentExecutions: ExtendedAgentExecution[]
  ): Promise<TeamPerformance> {
    const agentMap = new Map<string, AgentPerformance>();

    agentExecutions.forEach(exec => {
      const existing = agentMap.get(exec.agentId) || {
        agentId: exec.agentId,
        agentName: exec.agentName || `Agent ${exec.agentId.slice(0, 8)}`,
        agentType: exec.agentType || 'unknown',
        tasksAssigned: 0,
        tasksCompleted: 0,
        executionCount: 0,
        successRate: 0,
        averageTaskTime: 0,
        skills: []
      };

      existing.executionCount++;
      if (exec.success) {
        existing.tasksCompleted++;
      }
      existing.successRate = (existing.tasksCompleted / existing.executionCount) * 100;

      agentMap.set(exec.agentId, existing);
    });

    const taskPerformance: TaskPerformance[] = tasks.reduce((acc, task) => {
      const existing = acc.find(t => t.status === task.status);
      if (existing) {
        existing.count++;
        existing.averageHours = (existing.averageHours * (existing.count - 1) + (task.loggedHours || 0)) / existing.count;
        if (task.assigneeId) {
          existing.assigneeId = task.assigneeId;
        }
      } else {
        acc.push({
          status: task.status,
          count: 1,
          averageHours: task.loggedHours || 0,
          assigneeId: task.assigneeId ?? undefined
        });
      }
      return acc;
    }, [] as TaskPerformance[]);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;

    const agentUtilization = agentMap.size > 0 ?
      (agentMap.size / Math.max(5, agentMap.size + 2)) * 100 : 0;

    const tasksPerAgent = agentMap.size > 0 ? totalTasks / agentMap.size : 0;

    return {
      agents: Array.from(agentMap.values()),
      tasks: taskPerformance,
      productivity: {
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        averageTaskTime: tasks.reduce((sum, t) => sum + (t.loggedHours || 0), 0) / Math.max(totalTasks, 1)
      },
      efficiency: {
        tasksPerAgent,
        agentUtilization,
        bottleneck: this.identifyBottleneck(agentMap)
      }
    };
  }

  private identifyBottleneck(agents: Map<string, AgentPerformance>): string | undefined {
    const sortedBySuccess = Array.from(agents.values())
      .sort((a, b) => a.successRate - b.successRate);

    if (sortedBySuccess.length > 0 && sortedBySuccess[0].successRate < 50) {
      return sortedBySuccess[0].agentName;
    }

    return undefined;
  }

  private async generateRecommendations(
    project: Project,
    tasks: Task[],
    agentExecutions: ExtendedAgentExecution[]
  ): Promise<string[]> {
    const recommendations: string[] = [];

    const completionRate = tasks.filter(t => t.status === 'done').length / tasks.length;
    if (completionRate < 0.5) {
      recommendations.push('Consider reassigning critical tasks or adding more agent resources');
    }

    const overdueTasks = tasks.filter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    if (overdueTasks > 0) {
      recommendations.push(`Prioritize and reassign ${overdueTasks} overdue tasks to meet deadlines`);
    }

    const agentPerformances = await this.calculateTeamPerformance(tasks, agentExecutions);
    const bottlenecks = agentPerformances.efficiency.bottleneck;
    if (bottlenecks) {
      recommendations.push(`Focus on improving performance of agent: ${bottlenecks}`);
    }

    return recommendations;
  }

  private async identifyRisks(project: Project, tasks: Task[]): Promise<string[]> {
    const risks: string[] = [];

    const overdueTasks = tasks.filter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    if (overdueTasks > tasks.length * 0.3) {
      risks.push(`High risk: ${overdueTasks} tasks overdue (${Math.round((overdueTasks / tasks.length) * 100)}%)`);
    }

    const criticalTasks = tasks.filter(t => t.status === 'in_progress').length;
    if (criticalTasks > tasks.length * 0.6) {
      risks.push('Resource risk: Too many tasks in progress simultaneously');
    }

    const zeroProgressTasks = tasks.filter(t => t.loggedHours === 0 && t.status !== 'done').length;
    if (zeroProgressTasks > 0) {
      risks.push(`${zeroProgressTasks} tasks have no progress recorded`);
    }

    return risks;
  }

  private async suggestNextSteps(project: Project, tasks: Task[]): Promise<string[]> {
    const nextSteps: string[] = [];

    const tasksByStatus = tasks.reduce((acc, task) => {
      if (!acc[task.status]) acc[task.status] = [];
      acc[task.status].push(task);
      return acc;
    }, {} as Record<string, Task[]>);

    if (tasksByStatus['in_progress']?.length > 0) {
      const completedCount = tasksByStatus['done']?.length || 0;
      const inProgressCount = tasksByStatus['in_progress']?.length || 0;
      nextSteps.push(`${completedCount} tasks completed, ${inProgressCount} still in progress - maintain momentum`);
    }

    const completedTasks = tasksByStatus['done']?.length || 0;
    const totalTasks = tasks.length;
    if (completedTasks / totalTasks > 0.7) {
      nextSteps.push('Project approaching completion - consider reviewing final deliverables');
    }

    return nextSteps;
  }

  // Database helper methods
  private async getProjectTasks(projectId: string, userId: string): Promise<Task[]> {
    const tasks = this.db.all<any>(
      `SELECT t.* FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.project_id = ? AND p.user_id = ?
       ORDER BY t.sort_order, t.created_at DESC`,
      projectId, userId
    );

    return tasks.map(mapTask);
  }

  private async getAgentExecutions(projectId: string, userId: string): Promise<ExtendedAgentExecution[]> {
    const executions = this.db.all<any>(
      `SELECT ae.* FROM agent_executions ae
       JOIN tasks t ON ae.task_id = t.id
       JOIN projects p ON t.project_id = p.id
       WHERE t.project_id = ? AND p.user_id = ?
       ORDER BY ae.started_at DESC`,
      projectId, userId
    );

    return executions.map(mapAgentExecution);
  }

  private async getProjectMemories(userId: string): Promise<Memory[]> {
    const memories = this.db.all<any>(
      'SELECT * FROM memories WHERE user_id = ?',
      userId
    );

    return memories.map(mapMemory);
  }

  private async calculateProjectMetrics(projectId: string, userId: string): Promise<ProjectMetrics> {
    const project = await this.projectService.getProject(projectId, userId);
    if (!project) {
      throw new Error('Project not found');
    }

    const tasks = await this.getProjectTasks(projectId, userId);
    const healthScore = await this.calculateProjectHealthScore(project, tasks);

    return {
      projectId,
      name: project.name,
      healthScore: healthScore.overall,
      completionRate: tasks.filter(t => t.status === 'done').length / tasks.length * 100,
      overdueTasks: tasks.filter(t => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < new Date();
      }).length,
      teamSize: new Set(tasks.map(t => t.assigneeId).filter(Boolean)).size,
      lastUpdated: project.updatedAt
    };
  }

  private async calculateTrends(userId: string): Promise<TrendData[]> {
    const trends: TrendData[] = [];
    const now = new Date();

    for (const daysBack of [30, 60, 90]) {
      const date = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

      const projects = await this.projectService.listProjects(userId);
      const projectsMetrics = await Promise.all(
        projects.map(project => this.calculateProjectMetrics(project.id, userId))
      );

      const averageScore = projectsMetrics.reduce((sum, p) => sum + p.healthScore, 0) / projectsMetrics.length;

      trends.push({
        metric: 'project_health_score',
        timeframe: daysBack <= 30 ? 'daily' : daysBack <= 60 ? 'weekly' : 'monthly',
        data: [{ date: date.toISOString(), value: averageScore }],
        trend: calculateTrendDirection(averageScore, daysBack)
      });
    }

    return trends;
  }

  private async generateAlerts(userId: string): Promise<Alert[]> {
    const alerts: Alert[] = [];

    const projects = await this.projectService.listProjects(userId);
    for (const project of projects) {
      const tasks = await this.getProjectTasks(project.id, userId);
      const healthScore = await this.calculateProjectHealthScore(project, tasks);

      if (healthScore.overall < 50) {
        alerts.push({
          id: generateId(),
          type: 'critical',
          message: `Project "${project.name}" has low health score (${healthScore.overall})`,
          projectId: project.id,
          actionable: true,
          priority: 10
        });
      } else if (healthScore.overall < 75) {
        alerts.push({
          id: generateId(),
          type: 'warning',
          message: `Project "${project.name}" needs attention (health score: ${healthScore.overall})`,
          projectId: project.id,
          actionable: true,
          priority: 5
        });
      }

      const overdueTasks = tasks.filter(t => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < new Date() && t.status !== 'done';
      }).length;

      if (overdueTasks > 0) {
        alerts.push({
          id: generateId(),
          type: overdueTasks > tasks.length * 0.3 ? 'critical' : 'warning',
          message: `${overdueTasks} overdue tasks in project "${project.name}"`,
          projectId: project.id,
          actionable: true,
          priority: overdueTasks > tasks.length * 0.3 ? 8 : 3
        });
      }
    }

    return alerts.sort((a, b) => b.priority - a.priority);
  }

  // Additional analytics methods for team insights
  private async getAllTasksForUser(userId: string): Promise<Task[]> {
    const tasks = this.db.all<any>(
      `SELECT t.* FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE p.user_id = ?
       ORDER BY t.created_at DESC`,
      userId
    );

    return tasks.map(mapTask);
  }

  private async getAllAgentExecutions(userId: string): Promise<ExtendedAgentExecution[]> {
    const executions = this.db.all<any>(
      `SELECT ae.* FROM agent_executions ae
       JOIN tasks t ON ae.task_id = t.id
       JOIN projects p ON t.project_id = p.id
       WHERE p.user_id = ?
       ORDER BY ae.started_at DESC`,
      userId
    );

    return executions.map(mapAgentExecution);
  }
}