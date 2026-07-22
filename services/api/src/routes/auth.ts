import { spawn } from 'node:child_process';
import os from 'node:os';
import type { VestaraApp } from '../types.js';
import { generateId, generateToken } from '@vestara/utils';
import bcryptjs from 'bcryptjs';
import jsonwebtoken from 'jsonwebtoken';
import { getJwtSecret, JWT_EXPIRES_IN } from '@vestara/constants';
const JWT_SECRET = getJwtSecret();

const { hash, compare } = bcryptjs;
const { sign, verify } = jsonwebtoken;

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: string;
}

function getOsUser(): { username: string; homeDir: string; shell: string } | null {
  try {
    const info = os.userInfo();
    return {
      username: info.username,
      homeDir: info.homedir,
      shell: info.shell || process.env.SHELL || '/bin/bash',
    };
  } catch {
    return null;
  }
}

/**
 * Verify OS password using spawn (no shell) to avoid shell injection.
 * Pipes the password via stdin to sudo -S (which reads the password from stdin).
 */
function verifyOsPassword(username: string, password: string): boolean {
  // Try sudo -S first (reads password from stdin, works in most environments)
  try {
    const child = spawn('sudo', ['-S', '-k', 'echo', 'ok'], {
      stdio: ['pipe', 'ignore', 'ignore'],
      shell: false,
      timeout: 5000,
    });
    child.stdin.write(password + '\n');
    child.stdin.end();
    const exitCode = child.exitCode ?? (() => {
      // Synchronous wait — this is in a sync function
      const start = Date.now();
      while (child.exitCode === null) {
        if (Date.now() - start > 5000) break;
        // busy-wait is acceptable here since the timeout is very short (5s)
      }
      return child.exitCode;
    })();
    if (exitCode === 0) return true;
  } catch {
    // Fall through
  }

  // Fallback: try su with piped password (no shell)
  try {
    const child = spawn('su', ['-c', 'echo ok', username], {
      stdio: ['pipe', 'ignore', 'ignore'],
      shell: false,
      timeout: 5000,
    });
    child.stdin.write(password + '\n');
    child.stdin.end();
    const start = Date.now();
    while (child.exitCode === null) {
      if (Date.now() - start > 5000) break;
    }
    if (child.exitCode === 0) return true;
  } catch {
    // Fall through
  }

  return false;
}

export function registerAuthRoutes(app: VestaraApp) {
  app.post<{ Body: { name: string; email: string; password: string } }>(
    '/api/auth/register',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
        },
      },
    },
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
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
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

  /**
   * Get current OS user info
   */
  app.get('/api/auth/os-user', async () => {
    const osUser = getOsUser();
    if (!osUser) {
      return { user: null };
    }

    // Find or create user in database
    let user = app.db.get<UserRow>(
      'SELECT * FROM users WHERE email = ?',
      `${osUser.username}@os.local`,
    );

    if (!user) {
      const id = generateId();
      const passwordHash = await hash(osUser.username, 12);
      app.db.run(
        'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        id, osUser.username, `${osUser.username}@os.local`, passwordHash, 'admin',
      );
      user = app.db.get<UserRow>('SELECT * FROM users WHERE id = ?', id);
    }

    return {
      user: {
        id: user!.id,
        name: user!.name,
        email: user!.email,
        role: user!.role,
        homeDir: osUser.homeDir,
        shell: osUser.shell,
      },
    };
  });

  /**
   * Login with OS user credentials
   */
  app.post<{ Body: { username: string; password: string } }>(
    '/api/auth/os-login',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const { username, password } = request.body;

      if (!username || !password) {
        return reply.status(400).send({ error: 'Username and password required' });
      }

      // Verify against OS
      const osUser = getOsUser();
      if (!osUser) {
        return reply.status(500).send({ error: 'Could not detect OS user' });
      }

      // Allow login as current OS user
      if (username !== osUser.username) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Verify password against OS
      if (!verifyOsPassword(username, password)) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Find or create user
      let user = app.db.get<UserRow>(
        'SELECT * FROM users WHERE email = ?',
        `${username}@os.local`,
      );

      if (!user) {
        const id = generateId();
        const passwordHash = await hash(password, 12);
        app.db.run(
          'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
          id, username, `${username}@os.local`, passwordHash, 'admin',
        );
        user = app.db.get<UserRow>('SELECT * FROM users WHERE id = ?', id);
      }

      const token = sign({ userId: user!.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      const sessionId = generateId();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      app.db.run(
        'INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
        sessionId, user!.id, token, expiresAt,
      );

      return {
        user: { id: user!.id, name: user!.name, email: user!.email, role: user!.role },
        token,
      };
    },
  );

  /**
   * Auto-login as current OS user (no password required)
   */
  app.post('/api/auth/os-auto-login', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const osUser = getOsUser();
    if (!osUser) {
      return reply.status(500).send({ error: 'Could not detect OS user' });
    }

    // Find or create user
    let user = app.db.get<UserRow>(
      'SELECT * FROM users WHERE email = ?',
      `${osUser.username}@os.local`,
    );

    if (!user) {
      const id = generateId();
      const passwordHash = await hash(osUser.username, 12);
      app.db.run(
        'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        id, osUser.username, `${osUser.username}@os.local`, passwordHash, 'admin',
      );
      user = app.db.get<UserRow>('SELECT * FROM users WHERE id = ?', id);
    }

    const token = sign({ userId: user!.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const sessionId = generateId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    app.db.run(
      'INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      sessionId, user!.id, token, expiresAt,
    );

    return {
      user: { id: user!.id, name: user!.name, email: user!.email, role: user!.role },
      token,
    };
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
