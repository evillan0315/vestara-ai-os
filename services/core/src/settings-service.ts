import { Database } from './db.js';

export class SettingsService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  get(key: string): string | null {
    const row = this.db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
    return row?.value ?? null;
  }

  set(key: string, value: string): void {
    this.db.run(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `, key, value);
  }

  setMany(entries: Record<string, string>): void {
    this.db.transaction(() => {
      for (const [key, value] of Object.entries(entries)) {
        this.set(key, value);
      }
    });
  }

  getAll(): Record<string, string> {
    const rows = this.db.all<{ key: string; value: string }>('SELECT key, value FROM settings ORDER BY key');
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  delete(key: string): void {
    this.db.run('DELETE FROM settings WHERE key = ?', key);
  }

  clear(): void {
    this.db.run('DELETE FROM settings');
  }
}
