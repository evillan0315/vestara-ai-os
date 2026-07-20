import type { FastifyInstance } from 'fastify';
import { authMiddleware } from './auth.js';
import { generateId } from '@vestara/utils';

interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  model_id: string | null;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  tokens: number | null;
  created_at: string;
}

export function registerConversationRoutes(app: FastifyInstance) {
  app.get('/api/conversations', {
    preHandler: [authMiddleware],
  }, async (request) => {
    const userId = (request as any).userId;
    const conversations = app.db.all<ConversationRow>(
      'SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC',
      userId,
    );
    return { conversations };
  });

  app.get<{
    Params: { id: string };
  }>('/api/conversations/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;

    const conversation = app.db.get<ConversationRow>(
      'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
      id, userId,
    );
    if (!conversation) {
      return reply.status(404).send({ error: 'Conversation not found' });
    }

    const messages = app.db.all<MessageRow>(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      id,
    );

    return { conversation, messages };
  });

  app.post<{
    Body: { title?: string; modelId?: string };
  }>('/api/conversations', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const userId = (request as any).userId;
    const { title, modelId } = request.body || {};
    const id = generateId();

    app.db.run(
      'INSERT INTO conversations (id, user_id, title, model_id) VALUES (?, ?, ?, ?)',
      id, userId, title || 'New Conversation', modelId || null,
    );

    const conversation = app.db.get<ConversationRow>(
      'SELECT * FROM conversations WHERE id = ?',
      id,
    );

    return reply.status(201).send({ conversation });
  });

  app.post<{
    Params: { id: string };
    Body: { content: string; modelId?: string };
  }>('/api/conversations/:id/messages', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;
    const { content, modelId } = request.body;

    const conversation = app.db.get<ConversationRow>(
      'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
      id, userId,
    );
    if (!conversation) {
      return reply.status(404).send({ error: 'Conversation not found' });
    }

    // Save user message
    const userMsgId = generateId();
    app.db.run(
      'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
      userMsgId, id, 'user', content,
    );

    // TODO: Route to AI provider and get response
    // For now, return a placeholder
    const assistantMsgId = generateId();
    const response = 'This is a placeholder response. AI provider integration coming soon.';
    app.db.run(
      'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
      assistantMsgId, id, 'assistant', response,
    );

    // Update conversation timestamp
    app.db.run(
      'UPDATE conversations SET updated_at = datetime(\'now\') WHERE id = ?',
      id,
    );

    return {
      userMessage: { id: userMsgId, role: 'user', content },
      assistantMessage: { id: assistantMsgId, role: 'assistant', content: response },
    };
  });

  app.delete<{
    Params: { id: string };
  }>('/api/conversations/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;

    const conversation = app.db.get<ConversationRow>(
      'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
      id, userId,
    );
    if (!conversation) {
      return reply.status(404).send({ error: 'Conversation not found' });
    }

    app.db.run('DELETE FROM messages WHERE conversation_id = ?', id);
    app.db.run('DELETE FROM conversations WHERE id = ?', id);

    return { message: 'Conversation deleted' };
  });
}
