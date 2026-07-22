// ──────────────────────────────────────────────
// Project Analytics Mappers - DB Row Transformers
// ──────────────────────────────────────────────

import type { Database } from './db.js';
import type { Project } from './project-service.js';
import type { Task } from './project-service.js';
import type { AgentExecution } from '@vestara/types';
import type { Memory } from './memory-service.js';
import { generateId } from '@vestara/utils';

// Extended types for analytics with additional DB fields
interface ExtendedAgentExecution extends AgentExecution {
  agentName?: string;
  agentType?: string;
  taskId?: string;
  success?: boolean;
}

interface ExtendedMemory {
  id: string;
  userId: string;
  type: string;
  key: string;
  value: string;
  context?: string;
  importance: number;
  createdAt: string;
  updatedAt: string;
}

export function mapProject(row: any): Project {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    status: row.status,
    path: row.path,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapTask(row: any): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    assigneeId: row.assignee_id,
    parentId: row.parent_id,
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
    estimatedHours: row.estimated_hours,
    loggedHours: row.logged_hours,
    sortOrder: row.sort_order,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapAgentExecution(row: any): ExtendedAgentExecution {
  return {
    id: row.id,
    agentId: row.agent_id,
    agentName: row.agent_name,
    agentType: row.agent_type,
    taskId: row.task_id,
    input: row.input,
    output: row.output,
    tokens: row.tokens,
    cost: row.cost,
    success: row.success === 1 || row.success === true,
    startedAt: row.started_at,
    completedAt: row.completed_at
  };
}

export function mapMemory(row: any): Memory {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    content: row.content,
    importance: row.importance,
    accessCount: row.access_count,
    lastAccessedAt: row.last_accessed_at,
    consolidationId: row.consolidation_id,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function generateAlertId(): string {
  return generateId();
}