import { z } from 'zod';

// ── Auth ──────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

// ── Provider ──────────────────────────────────

export const createProviderSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['openai', 'anthropic', 'google', 'openrouter', 'ollama', 'lmstudio']),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  config: z.record(z.unknown()).optional(),
});

export const updateProviderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  config: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

// ── Conversation ──────────────────────────────

export const createConversationSchema = z.object({
  title: z.string().max(200).optional(),
  modelId: z.string().optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(100_000),
  modelId: z.string().optional(),
});

// ── Agent ─────────────────────────────────────

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum([
    'planner', 'developer', 'devops', 'cloud_engineer',
    'research', 'documentation', 'qa', 'security', 'custom',
  ]),
  providerId: z.string().optional(),
  modelId: z.string().optional(),
  config: z.object({
    systemPrompt: z.string().optional(),
    tools: z.array(z.string()).default([]),
    maxTokens: z.number().positive().optional(),
    temperature: z.number().min(0).max(2).optional(),
  }).optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  providerId: z.string().optional(),
  modelId: z.string().optional(),
  config: z.object({
    systemPrompt: z.string().optional(),
    tools: z.array(z.string()).optional(),
    maxTokens: z.number().positive().optional(),
    temperature: z.number().min(0).max(2).optional(),
  }).optional(),
});

// ── Project ───────────────────────────────────

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  path: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
});

// ── Knowledge ─────────────────────────────────

export const uploadDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export const searchKnowledgeSchema = z.object({
  query: z.string().min(1).max(1000),
  limit: z.number().min(1).max(50).default(5),
});

// ── Memory ────────────────────────────────────

export const createMemorySchema = z.object({
  key: z.string().min(1).max(200),
  value: z.string().min(1).max(10_000),
  type: z.enum(['working', 'short_term', 'long_term']).default('long_term'),
  context: z.string().max(1000).optional(),
  importance: z.number().min(0).max(1).default(0.5),
});

// ── Pagination ────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// ── Infer types ───────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateProviderInput = z.infer<typeof createProviderSchema>;
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type SearchKnowledgeInput = z.infer<typeof searchKnowledgeSchema>;
export type CreateMemoryInput = z.infer<typeof createMemorySchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
