import type { Database } from './db.js';
import type { EventBus } from './events.js';
import { createLogger } from './logger.js';
import { generateId } from '@vestara/utils';

const log = createLogger('memory-service');

export interface Memory {
  id: string;
  userId: string;
  type: 'fact' | 'preference' | 'context' | 'insight' | 'interaction';
  content: string;
  importance: number;
  accessCount: number;
  lastAccessedAt: string;
  consolidationId: number | null;
  metadata: string;
  createdAt: string;
  updatedAt: string;
}

export interface Consolidation {
  id: number;
  userId: string;
  summary: string;
  memoryCount: number;
  importance: number;
  createdAt: string;
}

export class MemoryService {
  private db: Database;
  private events: EventBus;

  constructor(db: Database, events: EventBus) {
    this.db = db;
    this.events = events;
    this.setupPeriodicConsolidation();
  }

  private setupPeriodicConsolidation(): void {
    setInterval(() => {
      this.consolidateMemories();
    }, 60 * 60 * 1000); // Every hour
  }

  async addMemory(
    userId: string,
    type: Memory['type'],
    content: string,
    importance: number = 0.5,
    metadata: Record<string, unknown> = {}
  ): Promise<Memory> {
    const id = generateId();
    this.db.prepare(`
      INSERT INTO memories (id, user_id, type, content, importance, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, type, content, importance, JSON.stringify(metadata));

    const memory = this.getMemory(id);

    this.events.emit('memory:added', { userId, memory });

    log.info({ userId, type, importance }, 'Memory added');
    return memory;
  }

  getMemory(id: string): Memory {
    const row = this.db.prepare('SELECT * FROM memories WHERE id = ?').get(id) as any;
    if (!row) throw new Error(`Memory ${id} not found`);

    // Update access count and timestamp
    this.db.prepare(`
      UPDATE memories
      SET access_count = access_count + 1,
          last_accessed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

    return this.mapMemory(row);
  }

  async searchMemories(
    userId: string,
    query: string,
    type?: Memory['type'],
    limit: number = 10
  ): Promise<Memory[]> {
    let sql = `
      SELECT * FROM memories
      WHERE user_id = ?
    `;
    const params: any[] = [userId];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    // Simple text search (in production, use vector similarity)
    sql += ' AND content LIKE ?';
    params.push(`%${query}%`);

    sql += ' ORDER BY importance DESC, last_accessed_at DESC LIMIT ?';
    params.push(limit);

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(this.mapMemory);
  }

  async getRecentMemories(userId: string, limit: number = 20): Promise<Memory[]> {
    const rows = this.db.prepare(`
      SELECT * FROM memories
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, limit) as any[];

    return rows.map(this.mapMemory);
  }

  async getImportantMemories(userId: string, limit: number = 10): Promise<Memory[]> {
    const rows = this.db.prepare(`
      SELECT * FROM memories
      WHERE user_id = ?
      ORDER BY importance DESC
      LIMIT ?
    `).all(userId, limit) as any[];

    return rows.map(this.mapMemory);
  }

  async deleteMemory(id: string): Promise<void> {
    this.db.prepare('DELETE FROM memories WHERE id = ?').run(id);
    this.events.emit('memory:deleted', { id });
    log.info({ id }, 'Memory deleted');
  }

  async consolidateMemories(userId?: string): Promise<Consolidation[]> {
    const sql = userId
      ? 'SELECT * FROM memories WHERE user_id = ? AND consolidation_id IS NULL AND importance >= 0.7 ORDER BY created_at DESC LIMIT 50'
      : 'SELECT * FROM memories WHERE consolidation_id IS NULL AND importance >= 0.7 ORDER BY created_at DESC LIMIT 50';

    const params = userId ? [userId] : [];
    const memories = this.db.prepare(sql).all(...params) as any[];

    if (memories.length < 3) return [];

    // Group by type and content similarity (simplified)
    const groups = new Map<string, any[]>();
    for (const memory of memories) {
      const key = memory.type;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(memory);
    }

    const consolidations: Consolidation[] = [];

    for (const [type, group] of groups) {
      if (group.length < 2) continue;

      const summary = this.generateSummary(group);
      const avgImportance = group.reduce((sum, m) => sum + m.importance, 0) / group.length;

      const stmt = this.db.prepare(`
        INSERT INTO consolidations (user_id, summary, memory_count, importance)
        VALUES (?, ?, ?, ?)
      `);

      const result = stmt.run(
        group[0].user_id,
        summary,
        group.length,
        Math.min(avgImportance * 1.2, 1.0)
      );

      const consolidationId = Number(result.lastInsertRowid);

      // Link memories to consolidation
      for (const memory of group) {
        this.db.prepare(`
          UPDATE memories SET consolidation_id = ? WHERE id = ?
        `).run(consolidationId, memory.id);
      }

      const consolidation = this.getConsolidation(consolidationId);
      consolidations.push(consolidation);

      this.events.emit('memory:consolidated', {
        consolidation,
        memoryCount: group.length,
      });

      log.info({ consolidationId, type, memoryCount: group.length }, 'Memories consolidated');
    }

    return consolidations;
  }

  private generateSummary(memories: any[]): string {
    // Simple summary generation (in production, use AI)
    const contents = memories.map(m => m.content);
    return `Consolidated ${contents.length} memories: ${contents.slice(0, 3).join('; ')}${contents.length > 3 ? '...' : ''}`;
  }

  private getConsolidation(id: number): Consolidation {
    const row = this.db.prepare('SELECT * FROM consolidations WHERE id = ?').get(id) as any;
    if (!row) throw new Error(`Consolidation ${id} not found`);
    return this.mapConsolidation(row);
  }

  async getConsolidations(userId: string, limit: number = 10): Promise<Consolidation[]> {
    const rows = this.db.prepare(`
      SELECT * FROM consolidations
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, limit) as any[];

    return rows.map(this.mapConsolidation);
  }

  async getMemoryStats(userId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    avgImportance: number;
    consolidatedCount: number;
  }> {
    const total = this.db.prepare(
      'SELECT COUNT(*) as count FROM memories WHERE user_id = ?'
    ).get(userId) as any;

    const byType = this.db.prepare(`
      SELECT type, COUNT(*) as count
      FROM memories WHERE user_id = ?
      GROUP BY type
    `).all(userId) as any[];

    const avgImportance = this.db.prepare(
      'SELECT AVG(importance) as avg FROM memories WHERE user_id = ?'
    ).get(userId) as any;

    const consolidated = this.db.prepare(
      'SELECT COUNT(*) as count FROM memories WHERE user_id = ? AND consolidation_id IS NOT NULL'
    ).get(userId) as any;

    return {
      total: total.count,
      byType: Object.fromEntries(byType.map((r: any) => [r.type, r.count])),
      avgImportance: avgImportance.avg || 0,
      consolidatedCount: consolidated.count,
    };
  }

  private mapMemory(row: any): Memory {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      content: row.content,
      importance: row.importance,
      accessCount: row.access_count,
      lastAccessedAt: row.last_accessed_at,
      consolidationId: row.consolidation_id,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapConsolidation(row: any): Consolidation {
    return {
      id: row.id,
      userId: row.user_id,
      summary: row.summary,
      memoryCount: row.memory_count,
      importance: row.importance,
      createdAt: row.created_at,
    };
  }
}
