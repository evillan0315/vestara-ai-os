import { randomUUID } from 'node:crypto';
import { PassThrough } from 'node:stream';
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
  app.get<{
    Querystring: { projectId?: string };
  }>('/api/providers/opencode/chats', {}, async (request) => {
    const { projectId } = request.query;

    let chats;
    if (projectId) {
      chats = app.db.all('SELECT * FROM opencode_chats WHERE project_id = ? ORDER BY updated_at DESC', projectId);
    } else {
      chats = app.db.all('SELECT * FROM opencode_chats ORDER BY updated_at DESC');
    }
    return { chats };
  });

  /**
   * Create a new OpenCode chat
   */
  app.post<{
    Body: { title?: string; model?: string; projectId?: string; cwd?: string; agent?: string; customInstructions?: string; fallbackModels?: string[] };
  }>('/api/providers/opencode/chats', {}, async (request, reply) => {
    const id = randomUUID();
    const title = request.body?.title || 'New Chat';
    const model = request.body?.model || 'opencode/deepseek-v4-flash-free';
    const projectId = request.body?.projectId || null;
    const cwd = request.body?.cwd || null;
    const agent = request.body?.agent || 'build';
    const customInstructions = request.body?.customInstructions || null;
    const fallbackModels = request.body?.fallbackModels || null;

    try {
      app.db.run(
        'INSERT INTO opencode_chats (id, project_id, title, model, cwd, agent, custom_instructions, fallback_models) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        id, projectId, title, model, cwd, agent, customInstructions, fallbackModels ? JSON.stringify(fallbackModels) : null,
      );
      const chat = app.db.get('SELECT * FROM opencode_chats WHERE id = ?', id);
      return { chat };
    } catch (err) {
      return reply.status(500).send({
        error: err instanceof Error ? err.message : 'Failed to create chat',
      });
    }
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
   * Rename an OpenCode chat
   */
  app.patch<{
    Params: { chatId: string };
    Body: { title: string };
  }>('/api/providers/opencode/chats/:chatId', {}, async (request, reply) => {
    const { chatId } = request.params;
    const { title } = request.body;

    if (!title || !title.trim()) {
      return reply.status(400).send({ error: 'Title is required' });
    }

    const chat = app.db.get('SELECT * FROM opencode_chats WHERE id = ?', chatId);
    if (!chat) return reply.status(404).send({ error: 'Chat not found' });

    app.db.run('UPDATE opencode_chats SET title = ?, updated_at = datetime(\'now\') WHERE id = ?', title.trim(), chatId);
    return { success: true };
  });

  /**
   * Send a message and stream the response via SSE
   */
  app.post<{
    Params: { chatId: string };
    Body: { content: string; model?: string; cwd?: string; agent?: string; customInstructions?: string; webSearch?: boolean; fallbackModels?: string[] };
  }>('/api/providers/opencode/chats/:chatId/messages/stream', {}, async (request, reply) => {
    const { chatId } = request.params;
    const { content, model, cwd, agent, customInstructions, webSearch, fallbackModels } = request.body;

    if (!content) {
      return reply.status(400).send({ error: 'Content is required' });
    }

    const chat = app.db.get<{ id: string; model: string }>('SELECT * FROM opencode_chats WHERE id = ?', chatId);
    if (!chat) return reply.status(404).send({ error: 'Chat not found' });

    const usedModel = model || chat.model;
    const usedAgent = agent || 'build';
    const userId = randomUUID();

    app.db.run(
      'INSERT INTO opencode_messages (id, chat_id, role, content, model) VALUES (?, ?, ?, ?, ?)',
      userId, chatId, 'user', content, usedModel,
    );

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const assistantId = randomUUID();
    let fullResponse = '';

    try {
      await opencode.sendPromptStream(content, (token) => {
        fullResponse += token;
        const safe = JSON.stringify(token);
        reply.raw.write(`data: ${safe}\n\n`);
      }, { model: usedModel, cwd, agent: usedAgent as any, customInstructions, webSearch, fallbackModels });

      app.db.run(
        'INSERT INTO opencode_messages (id, chat_id, role, content, model) VALUES (?, ?, ?, ?, ?)',
        assistantId, chatId, 'assistant', fullResponse, usedModel,
      );

      const msgCount = app.db.get<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM opencode_messages WHERE chat_id = ?', chatId,
      );
      if (msgCount && msgCount.cnt === 1) {
        const autoTitle = content.length > 60 ? content.slice(0, 60) + '...' : content;
        app.db.run('UPDATE opencode_chats SET title = ?, updated_at = datetime(\'now\') WHERE id = ?', autoTitle, chatId);
      } else {
        app.db.run('UPDATE opencode_chats SET updated_at = datetime(\'now\') WHERE id = ?', chatId);
      }

      reply.raw.write(`data: ${JSON.stringify({ done: true, assistantMessageId: assistantId })}\n\n`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Request failed';
      reply.raw.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
    } finally {
      reply.raw.end();
    }
  });

  /**
   * Send a message and get a response (saves to chat history)
   */
  app.post<{
    Params: { chatId: string };
    Body: { content: string; model?: string; cwd?: string };
  }>('/api/providers/opencode/chats/:chatId/messages', {}, async (request, reply) => {
    const { chatId } = request.params;
    const { content, model, cwd } = request.body;

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
      const response = await opencode.sendPrompt(content, { model: usedModel, cwd });

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
