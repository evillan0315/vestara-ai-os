import type { Database } from './db.js';
import type { EventBus } from './events.js';
import { createLogger } from './logger.js';

const log = createLogger('knowledge-service');

export interface KnowledgeEntry {
  id: number;
  projectId: number | null;
  type: 'document' | 'code' | 'url' | 'note' | 'conversation';
  title: string;
  content: string;
  embedding: string | null;
  tags: string[];
  source: string | null;
  metadata: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  entry: KnowledgeEntry;
  score: number;
}

export class KnowledgeService {
  private db: Database;
  private events: EventBus;

  constructor(db: Database, events: EventBus) {
    this.db = db;
    this.events = events;
  }

  async addEntry(
    projectId: number | null,
    type: KnowledgeEntry['type'],
    title: string,
    content: string,
    tags: string[] = [],
    source: string | null = null,
    metadata: Record<string, unknown> = {}
  ): Promise<KnowledgeEntry> {
    const stmt = this.db.prepare(`
      INSERT INTO knowledge_entries (project_id, type, title, content, tags, source, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      projectId,
      type,
      title,
      content,
      JSON.stringify(tags),
      source,
      JSON.stringify(metadata)
    );

    const entry = this.getEntry(Number(result.lastInsertRowid));

    // Generate embedding (placeholder — in production use OpenAI embeddings)
    // await this.generateEmbedding(entry.id, content);

    this.events.emit('knowledge:added', { entry });

    log.info({ entryId: entry.id, type, title }, 'Knowledge entry added');
    return entry;
  }

  getEntry(id: number): KnowledgeEntry {
    const row = this.db.prepare('SELECT * FROM knowledge_entries WHERE id = ?').get(id) as any;
    if (!row) throw new Error(`Knowledge entry ${id} not found`);
    return this.mapEntry(row);
  }

  async search(
    projectId: number | null,
    query: string,
    type?: KnowledgeEntry['type'],
    tags?: string[],
    limit: number = 10
  ): Promise<SearchResult[]> {
    let sql = `
      SELECT * FROM knowledge_entries
      WHERE (project_id = ? OR project_id IS NULL)
    `;
    const params: any[] = [projectId];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    // Text search
    sql += ' AND (title LIKE ? OR content LIKE ?)';
    params.push(`%${query}%`, `%${query}%`);

    // Tag filter
    if (tags && tags.length > 0) {
      sql += ' AND (';
      for (let i = 0; i < tags.length; i++) {
        sql += i > 0 ? ' OR ' : '';
        sql += 'tags LIKE ?';
        params.push(`%"${tags[i]}"%`);
      }
      sql += ')';
    }

    sql += ' ORDER BY updated_at DESC LIMIT ?';
    params.push(limit);

    const rows = this.db.prepare(sql).all(...params) as any[];

    // Simple relevance scoring (in production, use vector similarity)
    return rows.map(row => {
      const entry = this.mapEntry(row);
      let score = 0.5;

      // Boost for exact title match
      if (entry.title.toLowerCase().includes(query.toLowerCase())) {
        score += 0.3;
      }

      // Boost for more recent entries
      const age = Date.now() - new Date(entry.updatedAt).getTime();
      const daysSinceUpdate = age / (1000 * 60 * 60 * 24);
      score += Math.max(0, 0.2 - daysSinceUpdate * 0.001);

      return { entry, score };
    }).sort((a, b) => b.score - a.score);
  }

  async getEntries(
    projectId: number | null,
    type?: KnowledgeEntry['type'],
    limit: number = 50,
    offset: number = 0
  ): Promise<KnowledgeEntry[]> {
    let sql = `
      SELECT * FROM knowledge_entries
      WHERE (project_id = ? OR project_id IS NULL)
    `;
    const params: any[] = [projectId];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(this.mapEntry);
  }

  async updateEntry(
    id: number,
    updates: Partial<Pick<KnowledgeEntry, 'title' | 'content' | 'tags' | 'metadata'>>
  ): Promise<KnowledgeEntry> {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      params.push(updates.title);
    }
    if (updates.content !== undefined) {
      fields.push('content = ?');
      params.push(updates.content);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      params.push(JSON.stringify(updates.tags));
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }

    if (fields.length === 0) return this.getEntry(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    this.db.prepare(`UPDATE knowledge_entries SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    const entry = this.getEntry(id);
    this.events.emit('knowledge:updated', { entry });

    log.info({ entryId: id }, 'Knowledge entry updated');
    return entry;
  }

  async deleteEntry(id: number): Promise<void> {
    this.db.prepare('DELETE FROM knowledge_entries WHERE id = ?').run(id);
    this.events.emit('knowledge:deleted', { id });
    log.info({ id }, 'Knowledge entry deleted');
  }

  async getStats(projectId: number | null): Promise<{
    total: number;
    byType: Record<string, number>;
    totalSize: number;
  }> {
    const total = this.db.prepare(
      'SELECT COUNT(*) as count FROM knowledge_entries WHERE (project_id = ? OR project_id IS NULL)'
    ).get(projectId) as any;

    const byType = this.db.prepare(`
      SELECT type, COUNT(*) as count
      FROM knowledge_entries
      WHERE (project_id = ? OR project_id IS NULL)
      GROUP BY type
    `).all(projectId) as any[];

    const totalSize = this.db.prepare(`
      SELECT SUM(LENGTH(content)) as size
      FROM knowledge_entries
      WHERE (project_id = ? OR project_id IS NULL)
    `).get(projectId) as any;

    return {
      total: total.count,
      byType: Object.fromEntries(byType.map((r: any) => [r.type, r.count])),
      totalSize: totalSize.size || 0,
    };
  }

  async getContextForQuery(
    projectId: number | null,
    query: string,
    maxTokens: number = 2000
  ): Promise<string> {
    const results = await this.search(projectId, query, undefined, undefined, 5);

    if (results.length === 0) return '';

    let context = '## Relevant Knowledge\n\n';
    let tokenCount = 0;

    for (const { entry, score } of results) {
      const entryText = `### ${entry.title}\n${entry.content}\n\n`;
      const estimatedTokens = Math.ceil(entryText.length / 4);

      if (tokenCount + estimatedTokens > maxTokens) break;

      context += entryText;
      tokenCount += estimatedTokens;
    }

    return context;
  }

  private mapEntry(row: any): KnowledgeEntry {
    return {
      id: row.id,
      projectId: row.project_id,
      type: row.type,
      title: row.title,
      content: row.content,
      embedding: row.embedding,
      tags: JSON.parse(row.tags || '[]'),
      source: row.source,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
