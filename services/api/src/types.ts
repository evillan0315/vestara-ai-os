import type { FastifyInstance } from 'fastify';
import type { Database, MemoryService, KnowledgeService, AgentRuntime } from '@vestara/core';
import type { AIRouter } from './providers/router.js';

export interface VestaraApp extends FastifyInstance {
  db: Database;
  aiRouter: AIRouter;
  memoryService: MemoryService;
  knowledgeService: KnowledgeService;
  agentRuntime: AgentRuntime;
  broadcast: (event: string, data: unknown) => void;
}
