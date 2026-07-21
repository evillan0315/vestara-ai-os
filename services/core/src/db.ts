import DatabaseDriver from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export class Database {
  private db: DatabaseDriver.Database;

  constructor(dbPath: string) {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new DatabaseDriver(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('busy_timeout = 5000');
  }

  run(sql: string, ...params: unknown[]): DatabaseDriver.RunResult {
    return this.db.prepare(sql).run(...params);
  }

  get<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  close(): void {
    this.db.close();
  }

  pragma(sql: string): unknown {
    return this.db.pragma(sql);
  }

  prepare(sql: string): DatabaseDriver.Statement {
    return this.db.prepare(sql);
  }
}

export function createDatabase(dbPath: string): Database {
  return new Database(dbPath);
}

export function migrate(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      api_key_encrypted TEXT,
      base_url TEXT,
      config TEXT DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      context_window INTEGER NOT NULL DEFAULT 128000,
      speed TEXT NOT NULL DEFAULT 'medium',
      ram_required INTEGER,
      cost_per_1k_input REAL NOT NULL DEFAULT 0,
      cost_per_1k_output REAL NOT NULL DEFAULT 0,
      local INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      title TEXT NOT NULL DEFAULT 'New Conversation',
      model_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tokens INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding BLOB,
      metadata TEXT DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'long_term',
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      context TEXT,
      importance REAL NOT NULL DEFAULT 0.5,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      assignee_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      provider_id TEXT,
      model_id TEXT,
      config TEXT DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'idle',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS agent_executions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      input TEXT NOT NULL,
      output TEXT,
      tokens INTEGER,
      cost REAL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS plugins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      author TEXT NOT NULL,
      config TEXT DEFAULT '{}',
      installed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'system',
      priority TEXT NOT NULL DEFAULT 'medium',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

db.run(`
    CREATE TABLE IF NOT EXISTS opencode_chats (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      title TEXT NOT NULL DEFAULT 'New Chat',
      model TEXT NOT NULL DEFAULT 'opencode/deepseek-v4-flash-free',
      cwd TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS opencode_messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL REFERENCES opencode_chats(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      model TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS knowledge_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      type TEXT NOT NULL CHECK(type IN ('document', 'code', 'url', 'note', 'conversation')),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      source TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Migration: Add project_id to conversations if missing
  const convColumns = db.all<{ name: string }>("PRAGMA table_info(conversations)");
  if (!convColumns.some(c => c.name === 'project_id')) {
    db.run("ALTER TABLE conversations ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL");
  }

  // Migration: Add project_id to opencode_chats if missing
  const ocColumns = db.all<{ name: string }>("PRAGMA table_info(opencode_chats)");
  if (!ocColumns.some(c => c.name === 'project_id')) {
    db.run("ALTER TABLE opencode_chats ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL");
  }
  if (!ocColumns.some(c => c.name === 'cwd')) {
    db.run("ALTER TABLE opencode_chats ADD COLUMN cwd TEXT");
  }

  // Migration: Add task columns for new features
  const taskColumns = db.all<{ name: string }>("PRAGMA table_info(tasks)");
  if (!taskColumns.some(c => c.name === 'parent_id')) {
    db.run("ALTER TABLE tasks ADD COLUMN parent_id TEXT REFERENCES tasks(id) ON DELETE SET NULL");
  }
  if (!taskColumns.some(c => c.name === 'tags')) {
    db.run("ALTER TABLE tasks ADD COLUMN tags TEXT DEFAULT '[]'");
  }
  if (!taskColumns.some(c => c.name === 'estimated_hours')) {
    db.run("ALTER TABLE tasks ADD COLUMN estimated_hours REAL");
  }
  if (!taskColumns.some(c => c.name === 'logged_hours')) {
    db.run("ALTER TABLE tasks ADD COLUMN logged_hours REAL DEFAULT 0");
  }
  if (!taskColumns.some(c => c.name === 'sort_order')) {
    db.run("ALTER TABLE tasks ADD COLUMN sort_order INTEGER DEFAULT 0");
  }

  // Migration: Add memory columns for MemoryService
  const memColumns = db.all<{ name: string }>("PRAGMA table_info(memories)");
  if (!memColumns.some(c => c.name === 'consolidation_id')) {
    db.run("ALTER TABLE memories ADD COLUMN consolidation_id INTEGER REFERENCES consolidations(id) ON DELETE SET NULL");
  }
  if (!memColumns.some(c => c.name === 'content')) {
    db.run("ALTER TABLE memories ADD COLUMN content TEXT");
  }
  if (!memColumns.some(c => c.name === 'access_count')) {
    db.run("ALTER TABLE memories ADD COLUMN access_count INTEGER DEFAULT 0");
  }
  if (!memColumns.some(c => c.name === 'last_accessed_at')) {
    db.run("ALTER TABLE memories ADD COLUMN last_accessed_at TEXT");
  }
  if (!memColumns.some(c => c.name === 'metadata')) {
    db.run("ALTER TABLE memories ADD COLUMN metadata TEXT DEFAULT '{}'");
  }

  // Migration: Create memory_consolidations table if missing
  db.run(`
    CREATE TABLE IF NOT EXISTS consolidations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      summary TEXT NOT NULL,
      memory_count INTEGER NOT NULL DEFAULT 0,
      importance REAL NOT NULL DEFAULT 0.5,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Indexes for query performance
  const existingIndexes = db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL");
  const hasIndex = (name: string) => existingIndexes.some(i => i.name === name);

  if (!hasIndex('idx_memories_user_id'))        db.run('CREATE INDEX idx_memories_user_id ON memories(user_id)');
  if (!hasIndex('idx_memories_user_type'))       db.run('CREATE INDEX idx_memories_user_type ON memories(user_id, type)');
  if (!hasIndex('idx_memories_consolidation'))   db.run('CREATE INDEX idx_memories_consolidation ON memories(consolidation_id)');
  if (!hasIndex('idx_memories_created_at'))      db.run('CREATE INDEX idx_memories_created_at ON memories(created_at)');
  if (!hasIndex('idx_tasks_project_id'))         db.run('CREATE INDEX idx_tasks_project_id ON tasks(project_id)');
  if (!hasIndex('idx_tasks_status'))             db.run('CREATE INDEX idx_tasks_status ON tasks(status)');
  if (!hasIndex('idx_tasks_parent'))             db.run('CREATE INDEX idx_tasks_parent ON tasks(parent_id)');
  if (!hasIndex('idx_projects_user'))            db.run('CREATE INDEX idx_projects_user ON projects(user_id)');
  if (!hasIndex('idx_conversations_user'))       db.run('CREATE INDEX idx_conversations_user ON conversations(user_id)');
  if (!hasIndex('idx_activity_user'))            db.run('CREATE INDEX idx_activity_user ON activity_log(user_id)');
  if (!hasIndex('idx_activity_created'))         db.run('CREATE INDEX idx_activity_created ON activity_log(created_at)');
  if (!hasIndex('idx_notifications_user'))       db.run('CREATE INDEX idx_notifications_user ON notifications(user_id)');
  if (!hasIndex('idx_knowledge_project'))        db.run('CREATE INDEX idx_knowledge_project ON knowledge_entries(project_id)');
  if (!hasIndex('idx_agents_user'))              db.run('CREATE INDEX idx_agents_user ON agents(user_id)');
}
