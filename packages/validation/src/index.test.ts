import { describe, it, expect } from 'vitest';
import {
  createTaskSchema,
  updateTaskSchema,
  createProjectSchema,
  updateProjectSchema,
  cloneProjectSchema,
  bulkUpdateTasksSchema,
  loginSchema,
  registerSchema,
  createMemorySchema,
  paginationSchema,
} from './index.js';

describe('createTaskSchema', () => {
  it('accepts a valid minimal task', () => {
    const result = createTaskSchema.safeParse({ title: 'Fix login bug' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Fix login bug');
      expect(result.data.status).toBeUndefined();
    }
  });

  it('accepts a task with all optional fields', () => {
    const result = createTaskSchema.safeParse({
      title: 'Implement auth',
      description: 'Add JWT authentication',
      status: 'in_progress',
      assigneeId: 'user-123',
      parentId: 'task-456',
      tags: ['backend', 'security'],
      estimatedHours: 8,
      dueDate: '2026-08-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Implement auth');
      expect(result.data.status).toBe('in_progress');
      expect(result.data.tags).toEqual(['backend', 'security']);
      expect(result.data.estimatedHours).toBe(8);
    }
  });

  it('rejects empty title', () => {
    const result = createTaskSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing title', () => {
    const result = createTaskSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid status enum', () => {
    const result = createTaskSchema.safeParse({ title: 'Test', status: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('rejects title exceeding max length', () => {
    const result = createTaskSchema.safeParse({ title: 'A'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('rejects too many tags', () => {
    const tags = Array.from({ length: 11 }, (_, i) => `tag-${i}`);
    const result = createTaskSchema.safeParse({ title: 'Test', tags });
    expect(result.success).toBe(false);
  });

  it('rejects negative estimated hours', () => {
    const result = createTaskSchema.safeParse({ title: 'Test', estimatedHours: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects estimated hours exceeding max', () => {
    const result = createTaskSchema.safeParse({ title: 'Test', estimatedHours: 10001 });
    expect(result.success).toBe(false);
  });

  it('accepts due date as ISO datetime string', () => {
    const result = createTaskSchema.safeParse({
      title: 'Test',
      dueDate: '2026-12-31T23:59:59.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid due date format', () => {
    const result = createTaskSchema.safeParse({ title: 'Test', dueDate: 'not-a-date' });
    expect(result.success).toBe(false);
  });
});

describe('updateTaskSchema', () => {
  it('accepts partial updates', () => {
    const result = updateTaskSchema.safeParse({ title: 'Updated title' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (no updates)', () => {
    const result = updateTaskSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts status change', () => {
    const result = updateTaskSchema.safeParse({ status: 'done' });
    expect(result.success).toBe(true);
  });

  it('accepts loggedHours', () => {
    const result = updateTaskSchema.safeParse({ loggedHours: 4.5 });
    expect(result.success).toBe(true);
  });

  it('accepts sortOrder', () => {
    const result = updateTaskSchema.safeParse({ sortOrder: 2 });
    expect(result.success).toBe(true);
  });

  it('rejects negative sortOrder', () => {
    const result = updateTaskSchema.safeParse({ sortOrder: -1 });
    expect(result.success).toBe(false);
  });
});

describe('createProjectSchema', () => {
  it('accepts a valid minimal project', () => {
    const result = createProjectSchema.safeParse({ name: 'My Project' });
    expect(result.success).toBe(true);
  });

  it('accepts project with description and path', () => {
    const result = createProjectSchema.safeParse({
      name: 'Vestara',
      description: 'AI OS project',
      path: '/home/user/projects/vestara',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createProjectSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = createProjectSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('updateProjectSchema', () => {
  it('accepts status update', () => {
    const result = updateProjectSchema.safeParse({ status: 'archived' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = updateProjectSchema.safeParse({ status: 'deleted' });
    expect(result.success).toBe(false);
  });
});

describe('cloneProjectSchema', () => {
  it('applies defaults for optional booleans', () => {
    const result = cloneProjectSchema.safeParse({ name: 'Clone' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeTasks).toBe(true);
      expect(result.data.includeConversations).toBe(false);
      expect(result.data.includeOpenCodeChats).toBe(false);
    }
  });
});

describe('bulkUpdateTasksSchema', () => {
  it('accepts valid bulk update', () => {
    const result = bulkUpdateTasksSchema.safeParse({
      ids: ['id-1', 'id-2'],
      status: 'done',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty ids array', () => {
    const result = bulkUpdateTasksSchema.safeParse({ ids: [] });
    expect(result.success).toBe(false);
  });

  it('rejects more than 100 ids', () => {
    const ids = Array.from({ length: 101 }, (_, i) => `id-${i}`);
    const result = bulkUpdateTasksSchema.safeParse({ ids });
    expect(result.success).toBe(false);
  });

  it('accepts assigneeId as null', () => {
    const result = bulkUpdateTasksSchema.safeParse({
      ids: ['id-1'],
      assigneeId: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('loginSchema', () => {
  it('accepts valid login', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-email', password: 'password123' });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '123' });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('accepts valid registration', () => {
    const result = registerSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      password: 'securePass123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = registerSchema.safeParse({
      name: '',
      email: 'john@example.com',
      password: 'securePass123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password exceeding max length', () => {
    const result = registerSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      password: 'A'.repeat(129),
    });
    expect(result.success).toBe(false);
  });
});

describe('createMemorySchema', () => {
  it('accepts valid memory', () => {
    const result = createMemorySchema.safeParse({
      key: 'user-preference',
      value: 'Dark mode enabled',
    });
    expect(result.success).toBe(true);
  });

  it('applies default type and importance', () => {
    const result = createMemorySchema.safeParse({
      key: 'test',
      value: 'test value',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('long_term');
      expect(result.data.importance).toBe(0.5);
    }
  });

  it('rejects empty key', () => {
    const result = createMemorySchema.safeParse({ key: '', value: 'test' });
    expect(result.success).toBe(false);
  });

  it('rejects importance > 1', () => {
    const result = createMemorySchema.safeParse({
      key: 'test',
      value: 'test',
      importance: 1.5,
    });
    expect(result.success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('applies default pagination values', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('accepts custom pagination', () => {
    const result = paginationSchema.safeParse({ page: '2', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it('enforces max limit', () => {
    const result = paginationSchema.safeParse({ limit: '200' });
    expect(result.success).toBe(false);
  });
});
