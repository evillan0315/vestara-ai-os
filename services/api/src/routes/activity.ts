import type { VestaraApp } from '../types.js';
import { authMiddleware } from './auth.js';

export function registerActivityRoutes(app: VestaraApp) {
  app.get('/api/activity', {
    preHandler: [authMiddleware],
  }, async (request) => {
    const userId = (request as any).userId;
    const limit = Math.min(Number((request.query as any)?.limit) || 20, 100);

    const rows = app.db.all<any>(
      `SELECT al.*, u.name as user_name
       FROM activity_log al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.user_id = ?
       ORDER BY al.created_at DESC LIMIT ?`,
      userId, limit,
    );

    return {
      activity: rows.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        action: r.action,
        resource: r.resource,
        metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata || '{}') : (r.metadata || {}),
        createdAt: r.created_at,
      })),
    };
  });
}
