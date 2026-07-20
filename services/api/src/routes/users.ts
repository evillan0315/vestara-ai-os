import { execSync } from 'node:child_process';
import type { VestaraApp } from '../types.js';
import { generateId } from '@vestara/utils';
import bcryptjs from 'bcryptjs';
import { authMiddleware } from './auth.js';

const { hash } = bcryptjs;

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  avatar: string | null;
  created_at: string;
  updated_at: string;
}

function getSystemUsers(): Array<{ username: string; uid: number; homeDir: string; shell: string }> {
  try {
    const output = execSync("getent passwd | awk -F: '$3 >= 1000 || $3 == 0 {print $1, $3, $6, $7}'", {
      stdio: 'pipe',
      shell: '/usr/bin/sh',
    }).toString().trim();
    if (!output) return [];
    return output.split('\n').map((line) => {
      const [username, uid, homeDir, shell] = line.split(' ');
      return { username, uid: Number(uid), homeDir, shell };
    });
  } catch {
    return [];
  }
}

export function registerUserRoutes(app: VestaraApp) {
  /**
   * List all users (admin only)
   */
  app.get('/api/users', { preHandler: [authMiddleware] }, async (request, reply) => {
    const currentUser = app.db.get<UserRow>(
      'SELECT role FROM users WHERE id = ?', (request as any).userId,
    );
    if (!currentUser || currentUser.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const users = app.db.all<UserRow>(
      'SELECT id, name, email, role, avatar, created_at, updated_at FROM users ORDER BY created_at DESC',
    );
    return { users };
  });

  /**
   * Get system users from OS
   */
  app.get('/api/users/system', { preHandler: [authMiddleware] }, async (request, reply) => {
    const currentUser = app.db.get<UserRow>(
      'SELECT role FROM users WHERE id = ?', (request as any).userId,
    );
    if (!currentUser || currentUser.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const systemUsers = getSystemUsers();
    return { systemUsers };
  });

  /**
   * Get a single user
   */
  app.get<{ Params: { id: string } }>(
    '/api/users/:id',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const { id } = request.params;
      const user = app.db.get<UserRow>(
        'SELECT id, name, email, role, avatar, created_at, updated_at FROM users WHERE id = ?', id,
      );
      if (!user) return reply.status(404).send({ error: 'User not found' });
      return { user };
    },
  );

  /**
   * Create a new user
   */
  app.post<{
    Body: { name: string; email: string; password: string; role?: string };
  }>('/api/users', { preHandler: [authMiddleware] }, async (request, reply) => {
    const currentUser = app.db.get<UserRow>(
      'SELECT role FROM users WHERE id = ?', (request as any).userId,
    );
    if (!currentUser || currentUser.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const { name, email, password, role } = request.body;
    if (!name || !email || !password) {
      return reply.status(400).send({ error: 'Name, email, and password are required' });
    }

    const existing = app.db.get('SELECT id FROM users WHERE email = ?', email);
    if (existing) {
      return reply.status(409).send({ error: 'Email already exists' });
    }

    const id = generateId();
    const passwordHash = await hash(password, 12);
    const userRole = role || 'user';

    app.db.run(
      'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      id, name, email, passwordHash, userRole,
    );

    const user = app.db.get<UserRow>(
      'SELECT id, name, email, role, avatar, created_at, updated_at FROM users WHERE id = ?', id,
    );
    return reply.status(201).send({ user });
  });

  /**
   * Update a user
   */
  app.put<{
    Params: { id: string };
    Body: { name?: string; email?: string; password?: string; role?: string; avatar?: string };
  }>('/api/users/:id', { preHandler: [authMiddleware] }, async (request, reply) => {
    const currentUser = app.db.get<UserRow>(
      'SELECT role FROM users WHERE id = ?', (request as any).userId,
    );
    if (!currentUser || currentUser.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const { id } = request.params;
    const existing = app.db.get<UserRow>('SELECT * FROM users WHERE id = ?', id);
    if (!existing) return reply.status(404).send({ error: 'User not found' });

    const { name, email, password, role, avatar } = request.body;

    if (email && email !== existing.email) {
      const emailTaken = app.db.get('SELECT id FROM users WHERE email = ? AND id != ?', email, id);
      if (emailTaken) return reply.status(409).send({ error: 'Email already exists' });
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (email) { updates.push('email = ?'); values.push(email); }
    if (role) { updates.push('role = ?'); values.push(role); }
    if (avatar !== undefined) { updates.push('avatar = ?'); values.push(avatar); }
    if (password) {
      const passwordHash = await hash(password, 12);
      updates.push('password_hash = ?'); values.push(passwordHash);
    }

    if (updates.length === 0) {
      return reply.status(400).send({ error: 'No fields to update' });
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    app.db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, ...values);

    const user = app.db.get<UserRow>(
      'SELECT id, name, email, role, avatar, created_at, updated_at FROM users WHERE id = ?', id,
    );
    return { user };
  });

  /**
   * Delete a user
   */
  app.delete<{ Params: { id: string } }>(
    '/api/users/:id',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const currentUser = app.db.get<UserRow>(
        'SELECT role FROM users WHERE id = ?', (request as any).userId,
      );
      if (!currentUser || currentUser.role !== 'admin') {
        return reply.status(403).send({ error: 'Admin access required' });
      }

      const { id } = request.params;
      if (id === (request as any).userId) {
        return reply.status(400).send({ error: 'Cannot delete yourself' });
      }

      const existing = app.db.get<UserRow>('SELECT * FROM users WHERE id = ?', id);
      if (!existing) return reply.status(404).send({ error: 'User not found' });

      app.db.run('DELETE FROM sessions WHERE user_id = ?', id);
      app.db.run('DELETE FROM users WHERE id = ?', id);
      return { success: true };
    },
  );

  /**
   * Sync OS user into database
   */
  app.post<{ Body: { username: string } }>(
    '/api/users/sync-os',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const currentUser = app.db.get<UserRow>(
        'SELECT role FROM users WHERE id = ?', (request as any).userId,
      );
      if (!currentUser || currentUser.role !== 'admin') {
        return reply.status(403).send({ error: 'Admin access required' });
      }

      const { username } = request.body;
      if (!username) return reply.status(400).send({ error: 'Username required' });

      const systemUsers = getSystemUsers();
      const sysUser = systemUsers.find((u) => u.username === username);
      if (!sysUser) return reply.status(404).send({ error: 'System user not found' });

      const email = `${username}@os.local`;
      let user = app.db.get<UserRow>('SELECT * FROM users WHERE email = ?', email);

      if (!user) {
        const id = generateId();
        const passwordHash = await hash(username, 12);
        app.db.run(
          'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
          id, username, email, passwordHash, 'user',
        );
        user = app.db.get<UserRow>('SELECT * FROM users WHERE id = ?', id);
      }

      const safeUser = app.db.get<UserRow>(
        'SELECT id, name, email, role, avatar, created_at, updated_at FROM users WHERE id = ?', user!.id,
      );
      return { user: safeUser };
    },
  );
}
