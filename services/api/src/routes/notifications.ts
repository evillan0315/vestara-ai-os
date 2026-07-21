import type { VestaraApp } from '../types.js';
import { authMiddleware } from './auth.js';

export function registerNotificationRoutes(app: VestaraApp) {
  app.get('/api/notifications', {
    preHandler: [authMiddleware],
  }, async (request) => {
    const userId = (request as any).userId;
    const limit = Math.min(Number((request.query as any)?.limit) || 20, 100);
    const unreadOnly = (request.query as any)?.unreadOnly === 'true';

    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    if (unreadOnly) sql += ' AND read = 0';
    sql += ' ORDER BY created_at DESC LIMIT ?';

    const rows = app.db.all<any>(sql, userId, limit);
    const unread = app.db.get<any>(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0',
      userId,
    );

    return {
      notifications: rows.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        type: r.type,
        priority: r.priority,
        title: r.title,
        message: r.message,
        read: !!r.read,
        createdAt: r.created_at,
      })),
      unreadCount: unread?.count || 0,
    };
  });

  app.patch<{ Params: { id: string } }>('/api/notifications/:id/read', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = (request as any).userId;

    const existing = app.db.get<any>(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      id, userId,
    );
    if (!existing) return reply.status(404).send({ error: 'Notification not found' });

    app.db.run('UPDATE notifications SET read = 1 WHERE id = ?', id);
    return { success: true };
  });

  app.post('/api/notifications/read-all', {
    preHandler: [authMiddleware],
  }, async (request) => {
    const userId = (request as any).userId;
    app.db.run('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0', userId);
    return { success: true };
  });
}
