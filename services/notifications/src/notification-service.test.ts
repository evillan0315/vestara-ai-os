import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Database, EventBus, migrate } from '@vestara/core';
import { NotificationService } from './notification-service.js';

describe('NotificationService', () => {
  let db: Database;
  let events: EventBus;
  let service: NotificationService;

  beforeEach(() => {
    db = new Database(':memory:');
    migrate(db);
    db.run("INSERT INTO users (id, name, email, password_hash, role) VALUES ('user-1', 'User One', 'user1@test.com', 'hash', 'user')");
    db.run("INSERT INTO users (id, name, email, password_hash, role) VALUES ('user-2', 'User Two', 'user2@test.com', 'hash', 'user')");
    db.run("INSERT INTO users (id, name, email, password_hash, role) VALUES ('nobody', 'Nobody', 'nobody@test.com', 'hash', 'user')");
    db.run("INSERT INTO projects (id, user_id, name) VALUES ('proj-1', 'user-1', 'Project 1')");
    events = new EventBus();
    service = new NotificationService(db, events);
  });

  afterEach(() => {
    db.close();
  });

  describe('logActivity', () => {
    it('logs an activity entry', async () => {
      await service.logActivity('user-1', 'task:created', 'task:abc123', { projectId: 'proj-1' });
      const activity = await service.getProjectActivity('proj-1');
      expect(activity).toHaveLength(1);
      expect(activity[0].userId).toBe('user-1');
      expect(activity[0].action).toBe('task:created');
      expect(activity[0].resource).toBe('task:abc123');
      expect(activity[0].metadata).toEqual({ projectId: 'proj-1' });
    });

    it('logs activity without metadata', async () => {
      await service.logActivity('user-1', 'user:login', 'user:1');
      const rows = db.all('SELECT * FROM activity_log WHERE action = ?', 'user:login');
      expect(rows).toHaveLength(1);
    });

    it('creates activity entries with unique ids', async () => {
      await service.logActivity('user-1', 'a', 'r:1');
      await service.logActivity('user-1', 'b', 'r:2');
      const rows = db.all<{ id: string }>('SELECT id FROM activity_log');
      expect(rows[0].id).not.toBe(rows[1].id);
    });
  });

  describe('getProjectActivity', () => {
    it('returns activity for a project', async () => {
      await service.logActivity('user-1', 'first', 'r:1', { projectId: 'proj-1' });
      await service.logActivity('user-1', 'second', 'r:2', { projectId: 'proj-1' });
      const activity = await service.getProjectActivity('proj-1');
      expect(activity).toHaveLength(2);
      expect(activity.map(a => a.action).sort()).toEqual(['first', 'second']);
    });

    it('returns empty array for project with no activity', async () => {
      const activity = await service.getProjectActivity('nonexistent');
      expect(activity).toEqual([]);
    });

    it('respects limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await service.logActivity('user-1', `action:${i}`, `r:${i}`, { projectId: 'proj-1' });
      }
      const activity = await service.getProjectActivity('proj-1', 2);
      expect(activity).toHaveLength(2);
    });
  });

  describe('createNotification', () => {
    it('creates a notification', async () => {
      await service.createNotification('user-1', 'info', 'Test Notification', { detail: 'hello' });
      const notifications = await service.getNotifications('user-1');
      expect(notifications).toHaveLength(1);
      expect(notifications[0].userId).toBe('user-1');
      expect(notifications[0].type).toBe('info');
      expect(notifications[0].title).toBe('Test Notification');
      expect(notifications[0].read).toBe(false);
      expect(notifications[0].createdAt).toBeTruthy();
    });

    it('creates a notification with default priority', async () => {
      await service.createNotification('user-1', 'system', 'System message');
      const notifications = await service.getNotifications('user-1');
      expect(notifications[0].priority).toBe('medium');
    });

    it('creates a notification with custom priority', async () => {
      await service.createNotification('user-1', 'alert', 'Urgent!', undefined, 'high');
      const notifications = await service.getNotifications('user-1');
      expect(notifications[0].priority).toBe('high');
    });

    it('emits notification:new event', async () => {
      const handler = vi.fn();
      events.on('notification:new', handler);
      await service.createNotification('user-1', 'info', 'Test', { key: 'val' });
      expect(handler).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'info',
        title: 'Test',
        metadata: { key: 'val' },
      });
    });
  });

  describe('getNotifications', () => {
    it('returns notifications for a user', async () => {
      await service.createNotification('user-1', 'info', 'First');
      await service.createNotification('user-1', 'info', 'Second');
      const notifications = await service.getNotifications('user-1');
      expect(notifications).toHaveLength(2);
      expect(notifications.map(n => n.title).sort()).toEqual(['First', 'Second']);
    });

    it('scopes to user', async () => {
      await service.createNotification('user-1', 'info', 'U1 notif');
      await service.createNotification('user-2', 'info', 'U2 notif');
      const notifications = await service.getNotifications('user-1');
      expect(notifications).toHaveLength(1);
    });

    it('returns empty array for user with no notifications', async () => {
      const notifications = await service.getNotifications('nobody');
      expect(notifications).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('marks a single notification as read', async () => {
      await service.createNotification('user-1', 'info', 'Read me');
      const notifications = await service.getNotifications('user-1');
      expect(notifications[0].read).toBe(false);

      await service.markAsRead(notifications[0].id);
      const updated = await service.getNotifications('user-1');
      expect(updated[0].read).toBe(true);
    });

    it('is a no-op for non-existent notification', async () => {
      await expect(service.markAsRead('nonexistent')).resolves.toBeUndefined();
    });

    it('only marks the specified notification', async () => {
      await service.createNotification('user-1', 'info', 'A');
      await service.createNotification('user-1', 'info', 'B');
      const notifications = await service.getNotifications('user-1');
      await service.markAsRead(notifications[1].id); // mark older one

      const updated = await service.getNotifications('user-1');
      expect(updated.find(n => n.id === notifications[1].id)?.read).toBe(true);
      expect(updated.find(n => n.id === notifications[0].id)?.read).toBe(false);
    });
  });

  describe('markAllAsRead', () => {
    it('marks all unread notifications as read for a user', async () => {
      await service.createNotification('user-1', 'info', 'A');
      await service.createNotification('user-1', 'info', 'B');
      await service.markAllAsRead('user-1');

      const notifications = await service.getNotifications('user-1');
      expect(notifications.every(n => n.read)).toBe(true);
    });

    it('does not affect other users', async () => {
      await service.createNotification('user-1', 'info', 'U1');
      await service.createNotification('user-2', 'info', 'U2');
      await service.markAllAsRead('user-1');

      const u2notifs = await service.getNotifications('user-2');
      expect(u2notifs[0].read).toBe(false);
    });

    it('is a no-op when no unread notifications exist', async () => {
      await expect(service.markAllAsRead('nobody')).resolves.toBeUndefined();
    });
  });

  describe('getUnreadCount', () => {
    it('returns the count of unread notifications', async () => {
      await service.createNotification('user-1', 'info', 'A');
      await service.createNotification('user-1', 'info', 'B');
      await service.createNotification('user-1', 'info', 'C');
      const notifications = await service.getNotifications('user-1');
      await service.markAsRead(notifications[0].id);

      const count = await service.getUnreadCount('user-1');
      expect(count).toBe(2);
    });

    it('returns 0 when all notifications are read', async () => {
      await service.createNotification('user-1', 'info', 'A');
      await service.markAllAsRead('user-1');
      const count = await service.getUnreadCount('user-1');
      expect(count).toBe(0);
    });

    it('returns 0 for user with no notifications', async () => {
      const count = await service.getUnreadCount('nobody');
      expect(count).toBe(0);
    });
  });
});
