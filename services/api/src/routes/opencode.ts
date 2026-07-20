import type { VestaraApp } from '../types.js';
import * as opencode from '../providers/opencode.js';

export function registerOpenCodeRoutes(app: VestaraApp) {
  /**
   * Get OpenCode status
   */
  app.get('/api/providers/opencode/status', {}, async () => {
    return opencode.getStatus();
  });

  /**
   * Start OpenCode server
   */
  app.post('/api/providers/opencode/start', {}, async (request, reply) => {
    try {
      await opencode.startServer();
      return { status: 'started', port: opencode.getConfig().port };
    } catch (err) {
      return reply.status(500).send({
        error: err instanceof Error ? err.message : 'Failed to start OpenCode server',
      });
    }
  });

  /**
   * Stop OpenCode server
   */
  app.post('/api/providers/opencode/stop', {}, async () => {
    opencode.stopServer();
    return { status: 'stopped' };
  });

  /**
   * List available models
   */
  app.get('/api/providers/opencode/models', {}, async () => {
    const models = await opencode.listModels();
    return { models };
  });

  /**
   * Send a prompt to OpenCode
   */
  app.post<{
    Body: { prompt: string; model?: string; cwd?: string; agent?: string };
  }>('/api/providers/opencode/chat', {}, async (request, reply) => {
    const { prompt, model, cwd, agent } = request.body;

    if (!prompt) {
      return reply.status(400).send({ error: 'Prompt is required' });
    }

    try {
      const response = await opencode.sendPrompt(prompt, { model, cwd, agent: agent as any });
      return { response };
    } catch (err) {
      return reply.status(500).send({
        error: err instanceof Error ? err.message : 'OpenCode request failed',
      });
    }
  });

  /**
   * Configure OpenCode settings
   */
  app.post<{
    Body: { binaryPath?: string; port?: number; workDir?: string; autoStart?: boolean };
  }>('/api/providers/opencode/config', {}, async (request) => {
    const updates = request.body;
    opencode.configure(updates);
    return { config: opencode.getConfig() };
  });

  /**
   * Read OpenCode's own config file
   */
  app.get('/api/providers/opencode/opencode-config', {}, async () => {
    return opencode.readConfig();
  });

  /**
   * Write OpenCode's own config file
   */
  app.post<{
    Body: Record<string, unknown>;
  }>('/api/providers/opencode/opencode-config', {}, async (request) => {
    opencode.writeConfig(request.body);
    return { success: true };
  });

  /**
   * Check provider credentials
   */
  app.get<{
    Params: { provider: string };
  }>('/api/providers/opencode/credentials/:provider', {}, async (request) => {
    const { provider } = request.params;
    const hasCredentials = opencode.hasProviderCredentials(provider);
    return { provider, hasCredentials };
  });
}
