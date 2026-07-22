import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from './db.js';
import { runMigrations } from './migrations.js';

describe('runMigrations', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    // Create all base tables that migrations reference, matching the schema
    // that migrate() would produce. This lets runMigrations() run all migrations
    // without failing on missing tables.
    db.run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, email TEXT, password_hash TEXT, role TEXT, created_at TEXT, updated_at TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, created_at TEXT, updated_at TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, user_id TEXT, title TEXT, created_at TEXT, updated_at TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS opencode_chats (id TEXT PRIMARY KEY, title TEXT, model TEXT, created_at TEXT, updated_at TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, project_id TEXT, title TEXT, status TEXT, created_at TEXT, updated_at TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY, user_id TEXT, type TEXT, created_at TEXT, updated_at TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS agents (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, type TEXT, created_at TEXT, updated_at TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS agent_executions (id TEXT PRIMARY KEY, agent_id TEXT, input TEXT, started_at TEXT, completed_at TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS activity_log (id TEXT PRIMARY KEY, user_id TEXT, action TEXT, resource TEXT, created_at TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT, type TEXT, title TEXT, message TEXT, read INTEGER, created_at TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS knowledge_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id TEXT, type TEXT, title TEXT, content TEXT, created_at TEXT, updated_at TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS opencode_messages (id TEXT PRIMARY KEY, chat_id TEXT, role TEXT, content TEXT, created_at TEXT)`);
  });

  afterEach(() => {
    db.close();
  });

  it('creates the _migrations tracking table', () => {
    runMigrations(db);
    const tables = db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'");
    expect(tables).toHaveLength(1);
  });

  it('applies all standard migrations', () => {
    runMigrations(db);
    const applied = db.all<{ version: string; name: string }>('SELECT version, name FROM _migrations ORDER BY version');
    expect(applied.length).toBeGreaterThanOrEqual(8);
    expect(applied[0].version).toBe('1.0.0');
  });

  it('is idempotent — second call does not re-apply', () => {
    runMigrations(db);
    const first = db.all('SELECT version FROM _migrations ORDER BY version');
    runMigrations(db);
    const second = db.all('SELECT version FROM _migrations ORDER BY version');
    expect(second).toEqual(first);
  });

  it('adds columns to conversations', () => {
    runMigrations(db);
    const cols = db.all<{ name: string }>('PRAGMA table_info(conversations)');
    expect(cols.some(c => c.name === 'project_id')).toBe(true);
  });

  it('adds columns to opencode_chats', () => {
    runMigrations(db);
    const cols = db.all<{ name: string }>('PRAGMA table_info(opencode_chats)');
    expect(cols.some(c => c.name === 'project_id')).toBe(true);
    expect(cols.some(c => c.name === 'cwd')).toBe(true);
    expect(cols.some(c => c.name === 'agent')).toBe(true);
    expect(cols.some(c => c.name === 'custom_instructions')).toBe(true);
    expect(cols.some(c => c.name === 'fallback_models')).toBe(true);
  });

  it('adds columns to tasks', () => {
    runMigrations(db);
    const cols = db.all<{ name: string }>('PRAGMA table_info(tasks)');
    expect(cols.some(c => c.name === 'parent_id')).toBe(true);
    expect(cols.some(c => c.name === 'tags')).toBe(true);
    expect(cols.some(c => c.name === 'estimated_hours')).toBe(true);
    expect(cols.some(c => c.name === 'logged_hours')).toBe(true);
    expect(cols.some(c => c.name === 'sort_order')).toBe(true);
  });

  it('adds columns to memories', () => {
    runMigrations(db);
    const cols = db.all<{ name: string }>('PRAGMA table_info(memories)');
    expect(cols.some(c => c.name === 'content')).toBe(true);
    expect(cols.some(c => c.name === 'access_count')).toBe(true);
    expect(cols.some(c => c.name === 'last_accessed_at')).toBe(true);
    expect(cols.some(c => c.name === 'metadata')).toBe(true);
  });

  it('creates consolidations table', () => {
    runMigrations(db);
    const tables = db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='consolidations'");
    expect(tables).toHaveLength(1);
  });

  it('adds columns to agents', () => {
    runMigrations(db);
    const cols = db.all<{ name: string }>('PRAGMA table_info(agents)');
    expect(cols.some(c => c.name === 'description')).toBe(true);
    expect(cols.some(c => c.name === 'model')).toBe(true);
    expect(cols.some(c => c.name === 'system_prompt')).toBe(true);
    expect(cols.some(c => c.name === 'temperature')).toBe(true);
    expect(cols.some(c => c.name === 'max_tokens')).toBe(true);
    expect(cols.some(c => c.name === 'tools')).toBe(true);
    expect(cols.some(c => c.name === 'is_active')).toBe(true);
    expect(cols.some(c => c.name === 'metadata')).toBe(true);
  });

  it('adds columns to agent_executions', () => {
    runMigrations(db);
    const cols = db.all<{ name: string }>('PRAGMA table_info(agent_executions)');
    expect(cols.some(c => c.name === 'user_id')).toBe(true);
    expect(cols.some(c => c.name === 'conversation_id')).toBe(true);
    expect(cols.some(c => c.name === 'status')).toBe(true);
    expect(cols.some(c => c.name === 'duration')).toBe(true);
    expect(cols.some(c => c.name === 'error')).toBe(true);
    expect(cols.some(c => c.name === 'metadata')).toBe(true);
  });

  it('creates performance indexes', () => {
    runMigrations(db);
    const indexes = db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'");
    expect(indexes.length).toBeGreaterThanOrEqual(15);
  });
});
