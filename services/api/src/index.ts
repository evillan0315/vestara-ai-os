import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { getConfig } from '@vestara/config';
import { createLogger } from '@vestara/core';
import { createDatabase, migrate } from '@vestara/core';
import { MemoryService } from '@vestara/core';
import { KnowledgeService } from '@vestara/core';
import { AgentRuntime } from '@vestara/core';
import { registerAuthRoutes } from './routes/auth.js';
import { registerProviderRoutes } from './routes/providers.js';
import { registerConversationRoutes } from './routes/conversations.js';
import { registerAgentRoutes } from './routes/agents.js';
import { registerAgentRuntimeRoutes } from './routes/agent-runtime.js';
import { registerSystemRoutes } from './routes/system.js';
import { registerKnowledgeRoutes } from './routes/knowledge.js';
import { registerMemoryRoutes } from './routes/memory.js';
import { registerProjectRoutes } from './routes/projects.js';
import { registerWebSocketHandler } from './websocket.js';
import { registerOpenCodeRoutes } from './routes/opencode.js';
import { registerChatRoutes } from './routes/chat.js';
import { AIRouter, type ProviderConfig } from './providers/router.js';
import type { Database } from '@vestara/core';

const config = getConfig();
const logger = createLogger('api', config.logLevel);

// Load provider config from environment
const providerConfig: ProviderConfig = {};
if (process.env.OPENAI_API_KEY) {
  providerConfig.openai = { apiKey: process.env.OPENAI_API_KEY };
}
if (process.env.ANTHROPIC_API_KEY) {
  providerConfig.anthropic = { apiKey: process.env.ANTHROPIC_API_KEY };
}
if (process.env.GOOGLE_API_KEY) {
  providerConfig.google = { apiKey: process.env.GOOGLE_API_KEY };
}
// Ollama is always available if running
providerConfig.ollama = { baseUrl: config.ollama?.baseUrl || 'http://localhost:11434' };

// Create AI router
const aiRouter = new AIRouter(providerConfig, config.ai?.defaultProvider || 'openai');

async function main() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  // Database
  const db = createDatabase(config.database);
  migrate(db);
  app.decorate('db', db);
  app.decorate('aiRouter', aiRouter);

  // Services
  const events = (app as any).events || { emit: () => {}, on: () => {} };
  app.decorate('memoryService', new MemoryService(db, events));
  app.decorate('knowledgeService', new KnowledgeService(db, events));
  app.decorate('agentRuntime', new AgentRuntime(db, events));

  // CORS
  await app.register(cors, {
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  });

  // WebSocket
  await app.register(websocket);

  // Health check
  app.get('/api/health', async () => {
    const availability = await aiRouter.checkAvailability();
    return {
      status: 'ok',
      uptime: process.uptime(),
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      providers: availability,
    };
  });

  // Register routes
  registerAuthRoutes(app);
  registerProviderRoutes(app);
  registerConversationRoutes(app);
  registerAgentRoutes(app);
  registerAgentRuntimeRoutes(app);
  registerSystemRoutes(app);
  registerKnowledgeRoutes(app);
  registerMemoryRoutes(app);
  registerProjectRoutes(app);
  registerOpenCodeRoutes(app);
  registerChatRoutes(app);
  registerWebSocketHandler(app);

  // Start
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    logger.info(`Vestara API running on http://localhost:${config.port}`);
    logger.info({ providers: Object.keys(providerConfig) }, 'AI providers configured');
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

main();
