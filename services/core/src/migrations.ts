import type { Database } from './db.js';

export interface Migration {
  version: string;
  name: string;
  description: string;
  up: (db: Database) => void;
}

function columnExists(db: Database, table: string, column: string): boolean {
  const cols = db.all<{ name: string }>(`PRAGMA table_info(${table})`);
  return cols.some((c) => c.name === column);
}

function indexExists(db: Database, name: string): boolean {
  const row = db.get<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?",
    name,
  );
  return !!row;
}

const MIGRATIONS: Migration[] = [
  // 1.0.0 — Add project_id to conversations
  {
    version: '1.0.0',
    name: 'add-project-id-to-conversations',
    description: 'Add project_id column to conversations table',
    up: (db) => {
      if (!columnExists(db, 'conversations', 'project_id')) {
        db.run('ALTER TABLE conversations ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL');
      }
    },
  },

  // 1.1.0 — Extend opencode_chats schema
  {
    version: '1.1.0',
    name: 'extend-opencode-chats',
    description: 'Add project_id, cwd, agent, custom_instructions, fallback_models to opencode_chats',
    up: (db) => {
      if (!columnExists(db, 'opencode_chats', 'project_id')) {
        db.run('ALTER TABLE opencode_chats ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL');
      }
      if (!columnExists(db, 'opencode_chats', 'cwd')) {
        db.run('ALTER TABLE opencode_chats ADD COLUMN cwd TEXT');
      }
      if (!columnExists(db, 'opencode_chats', 'agent')) {
        db.run("ALTER TABLE opencode_chats ADD COLUMN agent TEXT DEFAULT 'build'");
      }
      if (!columnExists(db, 'opencode_chats', 'custom_instructions')) {
        db.run('ALTER TABLE opencode_chats ADD COLUMN custom_instructions TEXT');
      }
      if (!columnExists(db, 'opencode_chats', 'fallback_models')) {
        db.run('ALTER TABLE opencode_chats ADD COLUMN fallback_models TEXT');
      }
    },
  },

  // 1.2.0 — Extend tasks schema
  {
    version: '1.2.0',
    name: 'extend-tasks',
    description: 'Add parent_id, tags, estimated_hours, logged_hours, sort_order to tasks',
    up: (db) => {
      if (!columnExists(db, 'tasks', 'parent_id')) {
        db.run('ALTER TABLE tasks ADD COLUMN parent_id TEXT REFERENCES tasks(id) ON DELETE SET NULL');
      }
      if (!columnExists(db, 'tasks', 'tags')) {
        db.run("ALTER TABLE tasks ADD COLUMN tags TEXT DEFAULT '[]'");
      }
      if (!columnExists(db, 'tasks', 'estimated_hours')) {
        db.run('ALTER TABLE tasks ADD COLUMN estimated_hours REAL');
      }
      if (!columnExists(db, 'tasks', 'logged_hours')) {
        db.run('ALTER TABLE tasks ADD COLUMN logged_hours REAL DEFAULT 0');
      }
      if (!columnExists(db, 'tasks', 'sort_order')) {
        db.run('ALTER TABLE tasks ADD COLUMN sort_order INTEGER DEFAULT 0');
      }
    },
  },

  // 1.3.0 — Extend memories schema
  {
    version: '1.3.0',
    name: 'extend-memories',
    description: 'Add consolidation_id, content, access_count, last_accessed_at, metadata to memories',
    up: (db) => {
      if (!columnExists(db, 'memories', 'consolidation_id')) {
        db.run('ALTER TABLE memories ADD COLUMN consolidation_id INTEGER REFERENCES consolidations(id) ON DELETE SET NULL');
      }
      if (!columnExists(db, 'memories', 'content')) {
        db.run('ALTER TABLE memories ADD COLUMN content TEXT');
      }
      if (!columnExists(db, 'memories', 'access_count')) {
        db.run('ALTER TABLE memories ADD COLUMN access_count INTEGER DEFAULT 0');
      }
      if (!columnExists(db, 'memories', 'last_accessed_at')) {
        db.run('ALTER TABLE memories ADD COLUMN last_accessed_at TEXT');
      }
      if (!columnExists(db, 'memories', 'metadata')) {
        db.run("ALTER TABLE memories ADD COLUMN metadata TEXT DEFAULT '{}'");
      }
    },
  },

  // 1.4.0 — Create consolidations table
  {
    version: '1.4.0',
    name: 'create-consolidations',
    description: 'Create consolidations table for memory consolidation',
    up: (db) => {
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
    },
  },

  // 1.5.0 — Extend agents schema
  {
    version: '1.5.0',
    name: 'extend-agents',
    description: 'Add description, model, system_prompt, temperature, max_tokens, tools, is_active, metadata to agents',
    up: (db) => {
      if (!columnExists(db, 'agents', 'description')) {
        db.run("ALTER TABLE agents ADD COLUMN description TEXT NOT NULL DEFAULT ''");
      }
      if (!columnExists(db, 'agents', 'model')) {
        db.run("ALTER TABLE agents ADD COLUMN model TEXT NOT NULL DEFAULT ''");
      }
      if (!columnExists(db, 'agents', 'system_prompt')) {
        db.run("ALTER TABLE agents ADD COLUMN system_prompt TEXT NOT NULL DEFAULT ''");
      }
      if (!columnExists(db, 'agents', 'temperature')) {
        db.run('ALTER TABLE agents ADD COLUMN temperature REAL NOT NULL DEFAULT 0.7');
      }
      if (!columnExists(db, 'agents', 'max_tokens')) {
        db.run('ALTER TABLE agents ADD COLUMN max_tokens INTEGER NOT NULL DEFAULT 4096');
      }
      if (!columnExists(db, 'agents', 'tools')) {
        db.run("ALTER TABLE agents ADD COLUMN tools TEXT NOT NULL DEFAULT '[]'");
      }
      if (!columnExists(db, 'agents', 'is_active')) {
        db.run('ALTER TABLE agents ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
      }
      if (!columnExists(db, 'agents', 'metadata')) {
        db.run("ALTER TABLE agents ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}'");
      }
    },
  },

  // 1.6.0 — Extend agent_executions schema
  {
    version: '1.6.0',
    name: 'extend-agent-executions',
    description: 'Add user_id, conversation_id, status, duration, error, metadata to agent_executions',
    up: (db) => {
      if (!columnExists(db, 'agent_executions', 'user_id')) {
        db.run('ALTER TABLE agent_executions ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL');
      }
      if (!columnExists(db, 'agent_executions', 'conversation_id')) {
        db.run('ALTER TABLE agent_executions ADD COLUMN conversation_id TEXT');
      }
      if (!columnExists(db, 'agent_executions', 'status')) {
        db.run("ALTER TABLE agent_executions ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'");
      }
      if (!columnExists(db, 'agent_executions', 'duration')) {
        db.run('ALTER TABLE agent_executions ADD COLUMN duration INTEGER');
      }
      if (!columnExists(db, 'agent_executions', 'error')) {
        db.run('ALTER TABLE agent_executions ADD COLUMN error TEXT');
      }
      if (!columnExists(db, 'agent_executions', 'metadata')) {
        db.run("ALTER TABLE agent_executions ADD COLUMN metadata TEXT DEFAULT '{}'");
      }
    },
  },

  // 1.7.0 — Create performance indexes
  {
    version: '1.7.0',
    name: 'create-indexes',
    description: 'Create performance indexes on common query columns',
    up: (db) => {
      const indexes: Array<{ name: string; sql: string }> = [
        { name: 'idx_memories_user_id', sql: 'CREATE INDEX idx_memories_user_id ON memories(user_id)' },
        { name: 'idx_memories_user_type', sql: 'CREATE INDEX idx_memories_user_type ON memories(user_id, type)' },
        { name: 'idx_memories_consolidation', sql: 'CREATE INDEX idx_memories_consolidation ON memories(consolidation_id)' },
        { name: 'idx_memories_created_at', sql: 'CREATE INDEX idx_memories_created_at ON memories(created_at)' },
        { name: 'idx_tasks_project_id', sql: 'CREATE INDEX idx_tasks_project_id ON tasks(project_id)' },
        { name: 'idx_tasks_status', sql: 'CREATE INDEX idx_tasks_status ON tasks(status)' },
        { name: 'idx_tasks_parent', sql: 'CREATE INDEX idx_tasks_parent ON tasks(parent_id)' },
        { name: 'idx_projects_user', sql: 'CREATE INDEX idx_projects_user ON projects(user_id)' },
        { name: 'idx_conversations_user', sql: 'CREATE INDEX idx_conversations_user ON conversations(user_id)' },
        { name: 'idx_activity_user', sql: 'CREATE INDEX idx_activity_user ON activity_log(user_id)' },
        { name: 'idx_activity_created', sql: 'CREATE INDEX idx_activity_created ON activity_log(created_at)' },
        { name: 'idx_notifications_user', sql: 'CREATE INDEX idx_notifications_user ON notifications(user_id)' },
        { name: 'idx_knowledge_project', sql: 'CREATE INDEX idx_knowledge_project ON knowledge_entries(project_id)' },
        { name: 'idx_agents_user', sql: 'CREATE INDEX idx_agents_user ON agents(user_id)' },
        { name: 'idx_oc_chats_project', sql: 'CREATE INDEX idx_oc_chats_project ON opencode_chats(project_id)' },
        { name: 'idx_oc_msgs_chat', sql: 'CREATE INDEX idx_oc_msgs_chat ON opencode_messages(chat_id)' },
      ];

      for (const idx of indexes) {
        if (!indexExists(db, idx.name)) {
          db.run(idx.sql);
        }
      }
    },
  },
];

export function runMigrations(db: Database): void {
  // Create the migration tracking table
  db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Get already-applied migrations
  const applied = new Set(
    db.all<{ version: string }>('SELECT version FROM _migrations').map((r) => r.version),
  );

  // Run pending migrations in order
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;

    migration.up(db);

    db.run(
      'INSERT INTO _migrations (version, name, description) VALUES (?, ?, ?)',
      migration.version,
      migration.name,
      migration.description,
    );
  }
}
