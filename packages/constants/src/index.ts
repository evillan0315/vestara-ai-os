// ──────────────────────────────────────────────
// Shared Constants
// ──────────────────────────────────────────────

export const APP_NAME = 'Vestara AI OS';
export const APP_VERSION = '0.1.0';

export const API_PREFIX = '/api';
export const WS_PATH = '/ws';

export const DEFAULT_PORT = 3000;
export const OLLAMA_PORT = 11434;

export const DATABASE_NAME = 'vestara.db';

export const JWT_EXPIRES_IN = '7d';
export const JWT_SECRET = process.env.JWT_SECRET || 'vestara-dev-secret';

export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_MESSAGE_LENGTH = 100_000;

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export const MEMORY_CONSOLIDATION_INTERVAL = 60 * 60 * 1000; // 1 hour
export const SHORT_TERM_MEMORY_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const PROVIDER_DEFAULTS = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4.1', 'o3-mini'],
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com',
    models: ['claude-opus-4', 'claude-sonnet-4', 'claude-haiku-3.5'],
  },
  google: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash'],
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [],
  },
  ollama: {
    baseUrl: 'http://localhost:11434',
    models: [],
  },
  lmstudio: {
    baseUrl: 'http://localhost:1234',
    models: [],
  },
  opencode: {
    baseUrl: 'http://localhost:4096',
    models: [
      'anthropic/claude-opus-4-5-20251101',
      'anthropic/claude-sonnet-4-5-20250929',
      'anthropic/claude-haiku-4-5-20251001',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'openai/gpt-5.1-codex',
      'google/gemini-2.5-pro',
      'google/gemini-2.5-flash',
      'google/gemini-2.0-flash',
    ],
  },
} as const;

export const SYSTEM_PROMPTS = {
  assistant: `You are Vestara AI, a helpful AI assistant running on Vestara AI OS.
You help users with coding, research, documentation, and general tasks.
You have access to the user's projects, files, and knowledge base.
Be concise, accurate, and helpful.`,

  planner: `You are a task planning agent. Break down complex goals into actionable steps.
Output structured plans with clear dependencies and priorities.`,

  developer: `You are a software developer agent. Write, review, and refactor code.
Follow best practices and the user's coding conventions.
Output clean, well-documented code.`,

  researcher: `You are a research agent. Search for information, analyze data, and compile findings.
Cite sources and provide evidence-based conclusions.`,
} as const;

export const ACTIVITY_ACTIONS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  EXECUTE: 'execute',
  UPLOAD: 'upload',
  DOWNLOAD: 'download',
} as const;
