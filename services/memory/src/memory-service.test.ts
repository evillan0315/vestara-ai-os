import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Database, EventBus, migrate } from '@vestara/core';
import { MemoryService } from './memory-service.js';

describe('MemoryService', () => {
  let db: Database;
  let events: EventBus;
  let service: MemoryService;

  beforeEach(() => {
    db = new Database(':memory:');
    migrate(db);
    db.run("INSERT INTO users (id, name, email, password_hash, role) VALUES ('user-1', 'User One', 'user1@test.com', 'hash', 'user')");
    db.run("INSERT INTO users (id, name, email, password_hash, role) VALUES ('user-2', 'User Two', 'user2@test.com', 'hash', 'user')");
    db.run("INSERT INTO users (id, name, email, password_hash, role) VALUES ('nobody', 'Nobody', 'nobody@test.com', 'hash', 'user')");
    events = new EventBus();
    service = new MemoryService(db, events);
  });

  afterEach(() => {
    db.close();
  });

  describe('addMemory', () => {
    it('adds a memory with default importance', async () => {
      const memory = await service.addMemory('user-1', 'fact', 'User likes TypeScript');
      expect(memory.id).toMatch(/^[0-9a-f]{32}$/);
      expect(memory.userId).toBe('user-1');
      expect(memory.type).toBe('fact');
      expect(memory.content).toBe('User likes TypeScript');
      expect(memory.importance).toBe(0.5);
      expect(memory.accessCount).toBe(0);
      expect(memory.createdAt).toBeTruthy();
    });

    it('adds a memory with custom importance and metadata', async () => {
      const memory = await service.addMemory('user-1', 'preference', 'Dark mode', 0.9, { source: 'chat' });
      expect(memory.importance).toBe(0.9);
      expect(memory.metadata).toBe('{"source":"chat"}');
    });

    it('emits memory:added event', async () => {
      const handler = vi.fn();
      events.on('memory:added', handler);
      const memory = await service.addMemory('user-1', 'fact', 'Test');
      expect(handler).toHaveBeenCalledWith({ userId: 'user-1', memory });
    });

    it('supports all memory types', async () => {
      for (const type of ['fact', 'preference', 'context', 'insight', 'interaction'] as const) {
        const memory = await service.addMemory('user-1', type, `Test ${type}`);
        expect(memory.type).toBe(type);
      }
    });
  });

  describe('getMemory', () => {
    it('returns a memory by id', async () => {
      const created = await service.addMemory('user-1', 'fact', 'Hello');
      const memory = service.getMemory(created.id);
      expect(memory.id).toBe(created.id);
      expect(memory.content).toBe('Hello');
    });

    it('increments access count on read', async () => {
      const created = await service.addMemory('user-1', 'fact', 'Test');
      expect(service.getMemory(created.id).accessCount).toBe(1);
      expect(service.getMemory(created.id).accessCount).toBe(2);
    });

    it('throws for non-existent memory', () => {
      expect(() => service.getMemory('nonexistent')).toThrow('Memory nonexistent not found');
    });
  });

  describe('searchMemories', () => {
    it('finds memories by content substring', async () => {
      await service.addMemory('user-1', 'fact', 'User likes TypeScript');
      await service.addMemory('user-1', 'fact', 'User likes Python');
      await service.addMemory('user-1', 'preference', 'Dark mode');

      const results = await service.searchMemories('user-1', 'TypeScript');
      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('User likes TypeScript');
    });

    it('filters by type', async () => {
      await service.addMemory('user-1', 'fact', 'Some fact');
      await service.addMemory('user-1', 'preference', 'Some preference');

      const results = await service.searchMemories('user-1', 'Some', 'preference');
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('preference');
    });

    it('respects limit', async () => {
      for (let i = 0; i < 5; i++) {
        await service.addMemory('user-1', 'fact', `Memory ${i}`);
      }
      const results = await service.searchMemories('user-1', 'Memory', undefined, 2);
      expect(results).toHaveLength(2);
    });

    it('returns empty array for no matches', async () => {
      const results = await service.searchMemories('user-1', 'nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('getRecentMemories', () => {
    it('returns most recent memories for a user', async () => {
      await service.addMemory('user-1', 'fact', 'A');
      await service.addMemory('user-1', 'fact', 'B');
      await service.addMemory('user-2', 'fact', 'Other user');
      const recent = await service.getRecentMemories('user-1');
      expect(recent).toHaveLength(2);
      expect(recent.map(m => m.content).sort()).toEqual(['A', 'B']);
    });

    it('scopes to user', async () => {
      await service.addMemory('user-1', 'fact', 'U1 memory');
      await service.addMemory('user-2', 'fact', 'U2 memory');
      const recent = await service.getRecentMemories('user-1');
      expect(recent).toHaveLength(1);
    });
  });

  describe('getImportantMemories', () => {
    it('returns memories sorted by importance descending', async () => {
      const low = await service.addMemory('user-1', 'fact', 'Low', 0.1);
      const high = await service.addMemory('user-1', 'fact', 'High', 0.9);
      const important = await service.getImportantMemories('user-1');
      expect(important[0].id).toBe(high.id);
    });
  });

  describe('deleteMemory', () => {
    it('deletes a memory', async () => {
      const memory = await service.addMemory('user-1', 'fact', 'Delete me');
      await service.deleteMemory(memory.id);
      expect(() => service.getMemory(memory.id)).toThrow();
    });

    it('emits memory:deleted event', async () => {
      const handler = vi.fn();
      events.on('memory:deleted', handler);
      const memory = await service.addMemory('user-1', 'fact', 'Test');
      await service.deleteMemory(memory.id);
      expect(handler).toHaveBeenCalledWith({ id: memory.id });
    });

    it('does not throw for non-existent memory', async () => {
      await expect(service.deleteMemory('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('consolidateMemories', () => {
    it('skips consolidation when fewer than 3 high-importance memories exist', async () => {
      await service.addMemory('user-1', 'fact', 'M1', 0.9);
      await service.addMemory('user-1', 'fact', 'M2', 0.9);
      const result = await service.consolidateMemories('user-1');
      expect(result).toEqual([]);
    });

    it('creates consolidations for high-importance memories', async () => {
      await service.addMemory('user-1', 'fact', 'Alpha', 0.9);
      await service.addMemory('user-1', 'fact', 'Beta', 0.9);
      await service.addMemory('user-1', 'fact', 'Gamma', 0.9);

      const consolidations = await service.consolidateMemories('user-1');
      expect(consolidations).toHaveLength(1);
      expect(consolidations[0].userId).toBe('user-1');
      expect(consolidations[0].memoryCount).toBe(3);
      expect(consolidations[0].summary).toContain('Alpha');
      expect(consolidations[0].importance).toBeGreaterThanOrEqual(0.9);
    });

    it('creates separate consolidations per type', async () => {
      await service.addMemory('user-1', 'fact', 'F1', 0.9);
      await service.addMemory('user-1', 'fact', 'F2', 0.9);
      await service.addMemory('user-1', 'preference', 'P1', 0.9);
      await service.addMemory('user-1', 'preference', 'P2', 0.9);
      await service.addMemory('user-1', 'preference', 'P3', 0.9);

      const consolidations = await service.consolidateMemories('user-1');
      expect(consolidations).toHaveLength(2); // one per type
    });

    it('links consolidated memories and skips them next time', async () => {
      await service.addMemory('user-1', 'fact', 'A', 0.9);
      await service.addMemory('user-1', 'fact', 'B', 0.9);
      await service.addMemory('user-1', 'fact', 'C', 0.9);
      await service.consolidateMemories('user-1');

      // Second run should find nothing new to consolidate
      const result = await service.consolidateMemories('user-1');
      expect(result).toEqual([]);
    });

    it('emits memory:consolidated event', async () => {
      const handler = vi.fn();
      events.on('memory:consolidated', handler);
      await service.addMemory('user-1', 'fact', 'X', 0.9);
      await service.addMemory('user-1', 'fact', 'Y', 0.9);
      await service.addMemory('user-1', 'fact', 'Z', 0.9);
      await service.consolidateMemories('user-1');
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('getConsolidations', () => {
    it('lists consolidations for a user', async () => {
      await service.addMemory('user-1', 'fact', 'A', 0.9);
      await service.addMemory('user-1', 'fact', 'B', 0.9);
      await service.addMemory('user-1', 'fact', 'C', 0.9);
      await service.consolidateMemories('user-1');

      const list = await service.getConsolidations('user-1');
      expect(list).toHaveLength(1);
      expect(list[0].userId).toBe('user-1');
    });

    it('returns empty for user with no consolidations', async () => {
      const list = await service.getConsolidations('nobody');
      expect(list).toEqual([]);
    });
  });

  describe('getMemoryStats', () => {
    it('returns correct statistics', async () => {
      await service.addMemory('user-1', 'fact', 'F1', 0.9);
      await service.addMemory('user-1', 'fact', 'F2', 0.8);
      await service.addMemory('user-1', 'preference', 'P1', 0.5);

      const stats = await service.getMemoryStats('user-1');
      expect(stats.total).toBe(3);
      expect(stats.byType).toEqual({ fact: 2, preference: 1 });
      expect(stats.avgImportance).toBeCloseTo(0.733, 2);
      expect(stats.consolidatedCount).toBe(0);
    });

    it('includes consolidated count', async () => {
      await service.addMemory('user-1', 'fact', 'A', 0.9);
      await service.addMemory('user-1', 'fact', 'B', 0.9);
      await service.addMemory('user-1', 'fact', 'C', 0.9);
      await service.consolidateMemories('user-1');

      const stats = await service.getMemoryStats('user-1');
      expect(stats.consolidatedCount).toBe(3);
    });

    it('returns zeros for user with no memories', async () => {
      const stats = await service.getMemoryStats('nobody');
      expect(stats.total).toBe(0);
      expect(stats.byType).toEqual({});
      expect(stats.avgImportance).toBe(0);
      expect(stats.consolidatedCount).toBe(0);
    });
  });
});
