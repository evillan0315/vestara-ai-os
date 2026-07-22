import { type Database, type EventBus, createLogger } from '@vestara/core';
import { generateId } from '@vestara/utils';

const log = createLogger('notification-service');

export interface ActivityEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationEntry {
  id: string;
  userId: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export class NotificationService {
  private db: Database;
  private events: EventBus;

  constructor(db: Database, events: EventBus) {
    this.db = db;
    this.events = events;
  }

  async logActivity(userId: string, action: string, resource: string, metadata?: Record<string, unknown>): Promise<void> {
    const id = generateId();
    this.db.run(
      'INSERT INTO activity_log (id, user_id, action, resource, metadata) VALUES (?, ?, ?, ?, ?)',
      id, userId, action, resource, metadata ? JSON.stringify(metadata) : '{}',
    );
  }

  async getProjectActivity(projectId: string, limit = 50): Promise<ActivityEntry[]> {
    const rows = this.db.all<any>(
      `SELECT al.* FROM activity_log al
       JOIN projects p ON p.user_id = al.user_id
       WHERE p.id = ?
       ORDER BY al.created_at DESC LIMIT ?`,
      projectId, limit,
    );
    return rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      action: r.action,
      resource: r.resource,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
      createdAt: r.created_at,
    }));
  }

  async createNotification(
    userId: string,
    type: string,
    title: string,
    metadata?: Record<string, unknown>,
    priority = 'medium',
  ): Promise<void> {
    const id = generateId();
    this.db.run(
      'INSERT INTO notifications (id, user_id, type, priority, title, message, read) VALUES (?, ?, ?, ?, ?, ?, 0)',
      id, userId, type, priority, title, metadata ? JSON.stringify(metadata) : '{}',
    );
    this.events.emit('notification:new', { userId, type, title, metadata });
  }

  async getNotifications(userId: string, limit = 50): Promise<NotificationEntry[]> {
    const rows = this.db.all<any>(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      userId, limit,
    );
    return rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      priority: r.priority,
      title: r.title,
      message: typeof r.message === 'string' && r.message.startsWith('{') ? JSON.parse(r.message) : r.message,
      read: Boolean(r.read),
      createdAt: r.created_at,
    }));
  }

  async markAsRead(notificationId: string): Promise<void> {
    this.db.run('UPDATE notifications SET read = 1 WHERE id = ?', notificationId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    this.db.run('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0', userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const row = this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0',
      userId,
    );
    return row?.count ?? 0;
  }
}
