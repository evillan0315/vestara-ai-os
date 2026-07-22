import type { FastifyInstance } from 'fastify';
import type { Database, KnowledgeService, EventBus, ProjectService, SettingsService } from '@vestara/core';
import type { MemoryService } from '@vestara/memory';
import type { AgentRuntime } from '@vestara/agents';
import type { AIRouter } from './providers/router.js';

export interface VestaraApp extends FastifyInstance {
  db: Database;
  aiRouter: AIRouter;
  memoryService: MemoryService;
  knowledgeService: KnowledgeService;
  agentRuntime: AgentRuntime;
  projectService: ProjectService;
  settingsService: SettingsService;
  events: EventBus;
  broadcast: (event: string, data: unknown) => void;
}
