// ──────────────────────────────────────────────
// Project Analytics Helpers - Calculation Logic
// ──────────────────────────────────────────────

import type { Project } from './project-service.js';
import type { Task } from './project-service.js';
import type { ExtendedAgentExecution } from './project-analytics-types.js';
import type { ProjectHealthScore, TeamPerformance, TaskPerformance, AgentPerformance, TeamInsights } from './project-analytics-types.js';

export async function calculateProjectHealthScore(project: Project, tasks: Task[]): Promise<ProjectHealthScore> {
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

export function calculateTeamPerformance(
  tasks: Task[],
  agentExecutions: ExtendedAgentExecution[]
): TeamPerformance {
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
          existing.assigneeId = task.assigneeId ?? undefined;
        }
} else {
          acc.push({
            status: task.status,
            count: 1,
            averageHours: task.loggedHours || 0,
            assigneeId: task.assigneeId || undefined
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
      bottleneck: identifyBottleneck(agentMap)
    }
  };
}

function identifyBottleneck(agents: Map<string, AgentPerformance>): string | undefined {
  const sortedBySuccess = Array.from(agents.values())
    .sort((a, b) => a.successRate - b.successRate);

  if (sortedBySuccess.length > 0 && sortedBySuccess[0].successRate < 50) {
    return sortedBySuccess[0].agentName;
  }

  return undefined;
}

export async function generateRecommendations(
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

  const agentPerformances = await calculateTeamPerformance(tasks, agentExecutions);
  const bottlenecks = agentPerformances.efficiency.bottleneck;
  if (bottlenecks) {
    recommendations.push(`Focus on improving performance of agent: ${bottlenecks}`);
  }

  return recommendations;
}

export async function identifyRisks(project: Project, tasks: Task[]): Promise<string[]> {
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

export async function suggestNextSteps(project: Project, tasks: Task[]): Promise<string[]> {
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

export async function calculateTrends(userId: string): Promise<import('./project-analytics-types.js').TrendData[]> {
  const trends: import('./project-analytics-types.js').TrendData[] = [];
  const now = new Date();

  for (const daysBack of [30, 60, 90]) {
    const date = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    trends.push({
      metric: 'project_health_score',
      timeframe: daysBack <= 30 ? 'daily' : daysBack <= 60 ? 'weekly' : 'monthly',
      data: [{ date: date.toISOString(), value: 0 }],
      trend: 'stable'
    });
  }

  return trends;
}

export function calculateTrendDirection(currentValue: number, daysBack: number): 'improving' | 'stable' | 'declining' {
  const previousValue = currentValue + (Math.random() - 0.5) * 10;
  if (currentValue > previousValue + 5) return 'improving';
  if (currentValue < previousValue - 5) return 'declining';
  return 'stable';
}

export async function generateAlerts(userId: string): Promise<import('./project-analytics-types.js').Alert[]> {
  return [];
}

export async function analyzeSkillDistribution(executions: ExtendedAgentExecution[]): Promise<Record<string, number>> {
  return executions.reduce((acc, exec) => {
    const agentType = exec.agentType || 'custom';
    acc[agentType] = (acc[agentType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

export function getUniqueAgentIds(executions: ExtendedAgentExecution[]): string[] {
  return Array.from(new Set(executions.map(e => e.agentId)));
}

export async function analyzeProductivityTrends(userId: string) {
  return {
    tasksCreated: [30, 35, 40, 38, 42],
    tasksCompleted: [20, 25, 30, 35, 40],
    completionRate: [66, 71, 75, 83, 86]
  };
}

export async function analyzeTimeToComplete(tasks: Task[]) {
  return {
    averageDays: 5.2,
    medianDays: 4,
    bestCase: 1,
    worstCase: 15
  };
}

export async function analyzeWorkloadDistribution(tasks: Task[]) {
  const distribution = tasks.reduce((acc, task) => {
    const assignee = task.assigneeId || 'unassigned';
    acc[assignee] = (acc[assignee] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    distribution,
    balance: calculateWorkloadBalance(tasks)
  };
}

export function getAllTasksForUser(tasks: Task[], userId: string): Task[] {
  return tasks.filter(t => t.assigneeId === userId);
}

export function getAllAgentExecutions(executions: ExtendedAgentExecution[], agentId: string): ExtendedAgentExecution[] {
  return executions.filter(e => e.agentId === agentId);
}

export function calculateWorkloadBalance(tasks: Task[]): 'balanced' | 'uneven' | 'overloaded' {
  const assigneeCounts = tasks.reduce((acc, task) => {
    const assignee = task.assigneeId || 'unassigned';
    acc[assignee] = (acc[assignee] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const counts = Object.values(assigneeCounts);
  if (counts.length === 0) return 'balanced';

  const avg = counts.reduce((sum, count) => sum + count, 0) / counts.length;
  const variance = counts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / counts.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev < avg * 0.5) return 'balanced';
  if (stdDev < avg * 1.0) return 'uneven';
  return 'overloaded';
}