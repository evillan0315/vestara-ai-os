import { randomUUID } from 'node:crypto';
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

  /**
   * List all OpenCode chats
   */
  app.get('/api/providers/opencode/chats', {}, async () => {
    const chats = app.db.all<{
      id: string;
      title: string;
      model: string;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM opencode_chats ORDER BY updated_at DESC');
    return { chats };
  });

  /**
   * Create a new OpenCode chat
   */
  app.post<{
    Body: { title?: string; model?: string };
  }>('/api/providers/opencode/chats', {}, async (request) => {
    const id = randomUUID();
    const title = request.body?.title || 'New Chat';
    const model = request.body?.model || 'opencode/deepseek-v4-flash-free';
    app.db.run('INSERT INTO opencode_chats (id, title, model) VALUES (?, ?, ?)', id, title, model);
    const chat = app.db.get('SELECT * FROM opencode_chats WHERE id = ?', id);
    return { chat };
  });

  /**
   * Get a single chat with messages
   */
  app.get<{
    Params: { chatId: string };
  }>('/api/providers/opencode/chats/:chatId', {}, async (request, reply) => {
    const { chatId } = request.params;
    const chat = app.db.get('SELECT * FROM opencode_chats WHERE id = ?', chatId);
    if (!chat) return reply.status(404).send({ error: 'Chat not found' });

    const messages = app.db.all<{
      id: string;
      chat_id: string;
      role: string;
      content: string;
      model: string | null;
      created_at: string;
    }>('SELECT * FROM opencode_messages WHERE chat_id = ? ORDER BY created_at ASC', chatId);

    return { chat, messages };
  });

  /**
   * Delete an OpenCode chat
   */
  app.delete<{
    Params: { chatId: string };
  }>('/api/providers/opencode/chats/:chatId', {}, async (request, reply) => {
    const { chatId } = request.params;
    const chat = app.db.get('SELECT * FROM opencode_chats WHERE id = ?', chatId);
    if (!chat) return reply.status(404).send({ error: 'Chat not found' });

    app.db.run('DELETE FROM opencode_messages WHERE chat_id = ?', chatId);
    app.db.run('DELETE FROM opencode_chats WHERE id = ?', chatId);
    return { success: true };
  });

  /**
   * Send a message and get a response (saves to chat history)
   */
  app.post<{
    Params: { chatId: string };
    Body: { content: string; model?: string };
  }>('/api/providers/opencode/chats/:chatId/messages', {}, async (request, reply) => {
    const { chatId } = request.params;
    const { content, model } = request.body;

    if (!content) {
      return reply.status(400).send({ error: 'Content is required' });
    }

    const chat = app.db.get<{ id: string; model: string }>('SELECT * FROM opencode_chats WHERE id = ?', chatId);
    if (!chat) return reply.status(404).send({ error: 'Chat not found' });

    const usedModel = model || chat.model;
    const userId = randomUUID();

    // Save user message
    app.db.run(
      'INSERT INTO opencode_messages (id, chat_id, role, content, model) VALUES (?, ?, ?, ?, ?)',
      userId, chatId, 'user', content, usedModel,
    );

    try {
      const response = await opencode.sendPrompt(content, { model: usedModel });

      // Save assistant message
      const assistantId = randomUUID();
      app.db.run(
        'INSERT INTO opencode_messages (id, chat_id, role, content, model) VALUES (?, ?, ?, ?, ?)',
        assistantId, chatId, 'assistant', response, usedModel,
      );

      // Update chat timestamp and auto-title from first message
      const msgCount = app.db.get<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM opencode_messages WHERE chat_id = ?', chatId,
      );
      if (msgCount && msgCount.cnt === 1) {
        const autoTitle = content.length > 60 ? content.slice(0, 60) + '...' : content;
        app.db.run('UPDATE opencode_chats SET title = ?, updated_at = datetime(\'now\') WHERE id = ?', autoTitle, chatId);
      } else {
        app.db.run('UPDATE opencode_chats SET updated_at = datetime(\'now\') WHERE id = ?', chatId);
      }

      return { response, userMessageId: userId, assistantMessageId: assistantId };
    } catch (err) {
      return reply.status(500).send({
        error: err instanceof Error ? err.message : 'OpenCode request failed',
      });
    }
  });
}
