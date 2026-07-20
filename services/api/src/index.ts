import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { getConfig } from '@vestara/config';
import { createLogger } from '@vestara/core';
import { createDatabase, migrate } from '@vestara/core';
import { registerAuthRoutes } from './routes/auth.js';
import { registerProviderRoutes } from './routes/providers.js';
import { registerConversationRoutes } from './routes/conversations.js';
import { registerAgentRoutes } from './routes/agents.js';
import { registerSystemRoutes } from './routes/system.js';
import { registerKnowledgeRoutes } from './routes/knowledge.js';
import { registerMemoryRoutes } from './routes/memory.js';
import { registerProjectRoutes } from './routes/projects.js';
import { registerWebSocketHandler } from './websocket.js';
import { registerOpenCodeRoutes } from './routes/opencode.js';

const config = getConfig();
const logger = createLogger('api', config.logLevel);

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

  // CORS
  await app.register(cors, {
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  });

  // WebSocket
  await app.register(websocket);

  // Health check
  app.get('/api/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  }));

  // Register routes
  registerAuthRoutes(app);
  registerProviderRoutes(app);
  registerConversationRoutes(app);
  registerAgentRoutes(app);
  registerSystemRoutes(app);
  registerKnowledgeRoutes(app);
  registerMemoryRoutes(app);
  registerProjectRoutes(app);
  registerOpenCodeRoutes(app);
  registerWebSocketHandler(app);

  // Start
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    logger.info(`Vestara API running on http://localhost:${config.port}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

main();
