import type { VestaraApp } from '../types.js';
import { generateId, generateToken } from '@vestara/utils';
import { hash, compare } from 'bcryptjs';
import { sign, verify } from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '@vestara/constants';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: string;
}

export function registerAuthRoutes(app: VestaraApp) {
  app.post<{ Body: { name: string; email: string; password: string } }>(
    '/api/auth/register',
    async (request, reply) => {
      const { name, email, password } = request.body;

      const existing = app.db.get<UserRow>(
        'SELECT id FROM users WHERE email = ?',
        email,
      );
      if (existing) {
        return reply.status(409).send({ error: 'Email already registered' });
      }

      const id = generateId();
      const passwordHash = await hash(password, 12);

      app.db.run(
        'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
        id, name, email, passwordHash,
      );

      const token = sign({ userId: id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      const sessionId = generateId();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      app.db.run(
        'INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
        sessionId, id, token, expiresAt,
      );

      return reply.status(201).send({
        user: { id, name, email, role: 'user' },
        token,
      });
    },
  );

  app.post<{ Body: { email: string; password: string } }>(
    '/api/auth/login',
    async (request, reply) => {
      const { email, password } = request.body;

      const user = app.db.get<UserRow>(
        'SELECT * FROM users WHERE email = ?',
        email,
      );
      if (!user) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const valid = await compare(password, user.password_hash);
      if (!valid) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const token = sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      const sessionId = generateId();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      app.db.run(
        'INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
        sessionId, user.id, token, expiresAt,
      );

      return {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        token,
      };
    },
  );

  app.get('/api/auth/me', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const user = app.db.get<UserRow>(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      (request as any).userId,
    );
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }
    return { user };
  });

  app.delete('/api/auth/logout', {
    preHandler: [authMiddleware],
  }, async (request) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (token) {
      app.db.run('DELETE FROM sessions WHERE token = ?', token);
    }
    return { message: 'Logged out' };
  });
}

export async function authMiddleware(request: any, reply: any) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return reply.status(401).send({ error: 'Authentication required' });
  }

  try {
    const payload = verify(token, JWT_SECRET) as { userId: string };
    request.userId = payload.userId;
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}
