import type { FastifyInstance } from 'fastify';
import { authMiddleware } from './routes/auth.js';
import { parseModelString } from '../providers/router.js';
import type { ChatMessage } from '../providers/types.js';
import { generateId } from '@vestara/utils';

interface ConversationRow {
  id: string;
  title: string;
  model_id: string | null;
}

interface MessageRow {
  id: string;
  role: string;
  content: string;
}

export function registerChatRoutes(app: FastifyInstance) {
  /**
   * POST /api/chat — Send a message and get a response (non-streaming)
   */
  app.post<{
    Body: {
      conversationId?: string;
      content: string;
      model?: string;
      provider?: string;
    };
  }>('/api/chat', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const userId = (request as any).userId;
    const { conversationId, content, model, provider: preferredProvider } = request.body;

    if (!content?.trim()) {
      return reply.status(400).send({ error: 'Content is required' });
    }

    const router = (app as any).aiRouter;
    if (!router) {
      return reply.status(503).send({ error: 'AI router not available' });
    }

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      convId = generateId();
      app.db.run(
        'INSERT INTO conversations (id, user_id, title, model_id) VALUES (?, ?, ?, ?)',
        convId, userId, content.slice(0, 100), model || null,
      );
    }

    // Save user message
    const userMsgId = generateId();
    app.db.run(
      'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
      userMsgId, convId, 'user', content,
    );

    // Build message history
    const history = app.db.all<MessageRow>(
      'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      convId,
    );

    const messages: ChatMessage[] = history.map((m) => ({
      role: m.role as ChatMessage['role'],
      content: m.content,
    }));

    // Resolve model
    let resolvedProvider = preferredProvider;
    let resolvedModel = model;
    if (model) {
      const parsed = parseModelString(model);
      if (parsed.provider) resolvedProvider = parsed.provider;
      resolvedModel = parsed.model;
    }

    try {
      const response = await router.chat(
        {
          messages,
          model: resolvedModel,
          temperature: 0.7,
          maxTokens: 4096,
        },
        resolvedProvider,
      );

      // Save assistant message
      const assistantMsgId = generateId();
      app.db.run(
        'INSERT INTO messages (id, conversation_id, role, content, tokens) VALUES (?, ?, ?, ?, ?)',
        assistantMsgId, convId, 'assistant', response.content, response.tokens.output,
      );

      // Update conversation
      app.db.run(
        'UPDATE conversations SET updated_at = datetime(\'now\') WHERE id = ?',
        convId,
      );

      return {
        conversationId: convId,
        message: {
          id: assistantMsgId,
          role: 'assistant',
          content: response.content,
        },
        meta: {
          provider: response.provider,
          model: response.model,
          tokens: response.tokens,
          finishReason: response.finishReason,
        },
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'AI request failed';
      logger.error({ error: errorMsg }, 'Chat error');

      // Save error as assistant message
      const errorMsgId = generateId();
      app.db.run(
        'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
        errorMsgId, convId, 'assistant', `Error: ${errorMsg}`,
      );

      return reply.status(500).send({
        conversationId: convId,
        error: errorMsg,
      });
    }
  });

  /**
   * POST /api/chat/stream — Send a message and stream the response
   */
  app.post<{
    Body: {
      conversationId?: string;
      content: string;
      model?: string;
      provider?: string;
    };
  }>('/api/chat/stream', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const userId = (request as any).userId;
    const { conversationId, content, model, provider: preferredProvider } = request.body;

    if (!content?.trim()) {
      return reply.status(400).send({ error: 'Content is required' });
    }

    const router = (app as any).aiRouter;
    if (!router) {
      return reply.status(503).send({ error: 'AI router not available' });
    }

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      convId = generateId();
      app.db.run(
        'INSERT INTO conversations (id, user_id, title, model_id) VALUES (?, ?, ?, ?)',
        convId, userId, content.slice(0, 100), model || null,
      );
    }

    // Save user message
    const userMsgId = generateId();
    app.db.run(
      'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
      userMsgId, convId, 'user', content,
    );

    // Build message history
    const history = app.db.all<MessageRow>(
      'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      convId,
    );

    const messages: ChatMessage[] = history.map((m) => ({
      role: m.role as ChatMessage['role'],
      content: m.content,
    }));

    // Resolve model
    let resolvedProvider = preferredProvider;
    let resolvedModel = model;
    if (model) {
      const parsed = parseModelString(model);
      if (parsed.provider) resolvedProvider = parsed.provider;
      resolvedModel = parsed.model;
    }

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send conversation ID
    reply.raw.write(`data: ${JSON.stringify({ conversationId: convId })}\n\n`);

    let fullContent = '';

    try {
      for await (const chunk of router.chatStream(
        {
          messages,
          model: resolvedModel,
          temperature: 0.7,
          maxTokens: 4096,
        },
        resolvedProvider,
      )) {
        if (chunk.done) {
          // Save the complete response
          const assistantMsgId = generateId();
          app.db.run(
            'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
            assistantMsgId, convId, 'assistant', fullContent,
          );

          app.db.run(
            'UPDATE conversations SET updated_at = datetime(\'now\') WHERE id = ?',
            convId,
          );

          reply.raw.write(`data: ${JSON.stringify({ done: true, messageId: assistantMsgId })}\n\n`);
        } else {
          fullContent += chunk.content;
          reply.raw.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Stream failed';
      logger.error({ error: errorMsg }, 'Chat stream error');
      reply.raw.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
    }

    reply.raw.end();
  });
}

const logger = {
  error: (obj: Record<string, unknown>, msg: string) => console.error(msg, obj),
};
