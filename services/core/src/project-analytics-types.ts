// ──────────────────────────────────────────────
// Project Analytics Types
// ──────────────────────────────────────────────

import type { Project } from './project-service.js';
import type { Task } from './project-service.js';
import type { AgentExecution } from '@vestara/types';
import type { Memory } from './memory-service.js';

// Extended AgentExecution with additional fields for analytics
export interface ExtendedAgentExecution extends AgentExecution {
  agentName?: string;
  agentType?: string;
  taskId?: string;
  success?: boolean;
}

export interface ProjectHealthScore {
  overall: number; // 0-100
  metrics: {
    taskCompletion: number;
    timelineAdherence: number;
    resourceUtilization: number;
    riskLevel: number;
  };
  status: 'excellent' | 'good' | 'warning' | 'critical';
  trends: {
    taskCompletion: number;
    timeline: number;
  };
}

export interface TeamPerformance {
  agents: AgentPerformance[];
  tasks: TaskPerformance[];
  productivity: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    averageTaskTime: number;
  };
  efficiency: {
    tasksPerAgent: number;
    agentUtilization: number;
    bottleneck?: string;
  };
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  agentType: string;
  tasksAssigned: number;
  tasksCompleted: number;
  executionCount: number;
  successRate: number;
  averageTaskTime: number;
  skills: string[];
  bottleneck?: boolean;
}

export interface TaskPerformance {
  status: string;
  count: number;
  averageHours: number;
  assigneeId?: string;
}

export interface ProjectInsights {
  projectId: string;
  healthScore: ProjectHealthScore;
  teamPerformance: TeamPerformance;
  recommendations: string[];
  risks: string[];
  nextSteps: string[];
}

export interface AnalyticsSnapshot {
  timestamp: string;
  projects: ProjectMetrics[];
  trends: TrendData[];
  alerts: Alert[];
}

export interface ProjectMetrics {
  projectId: string;
  name: string;
  healthScore: number;
  completionRate: number;
  overdueTasks: number;
  teamSize: number;
  lastUpdated: string;
}

export interface TrendData {
  metric: string;
  timeframe: 'daily' | 'weekly' | 'monthly';
  data: Array<{ date: string; value: number }>;
  trend: 'improving' | 'stable' | 'declining';
}

export interface Alert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  message: string;
  projectId?: string;
  actionable: boolean;
  priority: number;
}

export interface TeamInsights {
  totalProjects: number;
  totalTasks: number;
  activeAgents: string[];
  skillDistribution: Record<string, number>;
  productivityTrends: {
    tasksCreated: number[];
    tasksCompleted: number[];
    completionRate: number[];
  };
  timeToComplete: {
    averageDays: number;
    medianDays: number;
    bestCase: number;
    worstCase: number;
  };
  workloadDistribution: {
    distribution: Record<string, number>;
    balance: 'balanced' | 'uneven' | 'overloaded';
  };
}