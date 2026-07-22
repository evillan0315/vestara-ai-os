// ──────────────────────────────────────────────
// Shared Constants
// ──────────────────────────────────────────────

export const APP_NAME = 'Vestara AI OS';
export const APP_VERSION = '0.1.0';

export const API_PREFIX = '/api';
export const WS_PATH = '/ws';

export const DEFAULT_PORT = 3000;
export const OLLAMA_PORT = 11434;
export const OPENCODE_PORT = 4096;

export const DATABASE_NAME = 'vestara.db';

export const JWT_EXPIRES_IN = '7d';

const JWT_DEV_SECRET = 'vestara-dev-secret';

/** Get the JWT secret from env or generate a dev-only fallback with a warning */
export function getJwtSecret(): string {
  if (typeof process !== 'undefined' && process.env?.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET environment variable is required in production. ' +
      'Set it to a long, random string (e.g., openssl rand -hex 64).'
    );
  }
  console.warn(
    '[vestara] WARNING: Using default JWT_SECRET for development only. ' +
    'Set JWT_SECRET environment variable in production.'
  );
  return JWT_DEV_SECRET;
}

export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_MESSAGE_LENGTH = 100_000;

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export const MEMORY_CONSOLIDATION_INTERVAL = 60 * 60 * 1000; // 1 hour
export const SHORT_TERM_MEMORY_TTL = 24 * 60 * 60 * 1000; // 24 hours

// ──────────────────────────────────────────────
// Provider & Model Registry
// ──────────────────────────────────────────────

export interface ModelInfo {
  id: string;
  name: string;
  context?: number;
  inputPrice?: number;
  outputPrice?: number;
  description?: string;
}

export interface ProviderInfo {
  name: string;
  icon: string;
  color: string;
  description: string;
  baseUrl: string;
  models: readonly ModelInfo[];
  features: readonly string[];
}

export const OPENCODE_MODELS = [
  { id: 'opencode/deepseek-v4-flash-free', name: 'DeepSeek V4 Flash (Free)', description: 'Fast, free coding model' },
  { id: 'opencode/mimo-v2.5-free', name: 'Mimo V2.5 (Free)', description: 'Multimodal free model' },
  { id: 'opencode/nemotron-3-ultra-free', name: 'Nemotron 3 Ultra (Free)', description: 'NVIDIA large free model' },
  { id: 'opencode/north-mini-code-free', name: 'North Mini Code (Free)', description: 'Compact code model' },
  { id: 'opencode/big-pickle', name: 'Big Pickle', description: 'General purpose model' },
] as const;

export const PROVIDERS: Record<string, ProviderInfo> = {
  opencode: {
    name: 'OpenCode',
    icon: '⚡',
    color: 'gold',
    description: 'Open-source AI coding agent — 75+ models via AI SDK',
    baseUrl: `http://localhost:${OPENCODE_PORT}`,
    models: OPENCODE_MODELS,
    features: ['free', 'local-server', 'iframe', 'chat-history'],
  },
  ollama: {
    name: 'Ollama',
    icon: '🦙',
    color: 'cyan',
    description: 'Local model inference — no API key required',
    baseUrl: `http://localhost:${OLLAMA_PORT}`,
    models: [],
    features: ['local', 'no-api-key', 'gpu'],
  },
  openai: {
    name: 'OpenAI',
    icon: '🟢',
    color: 'green',
    description: 'GPT-4o, GPT-4.1, o3-mini',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', context: 128_000, inputPrice: 2.50, outputPrice: 10, description: 'Best overall model' },
      { id: 'gpt-4.1', name: 'GPT-4.1', context: 1_000_000, inputPrice: 2, outputPrice: 8, description: 'Latest flagship model' },
      { id: 'o3-mini', name: 'o3-mini', context: 200_000, inputPrice: 1.10, outputPrice: 4.40, description: 'Fast reasoning model' },
    ],
    features: ['api-key-required', 'streaming'],
  },
  anthropic: {
    name: 'Anthropic',
    icon: '🟤',
    color: 'amber',
    description: 'Claude Opus, Sonnet, Haiku',
    baseUrl: 'https://api.anthropic.com',
    models: [
      { id: 'claude-opus-4', name: 'Claude Opus 4', context: 200_000, inputPrice: 15, outputPrice: 75, description: 'Most capable model' },
      { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', context: 200_000, inputPrice: 3, outputPrice: 15, description: 'Balanced performance' },
      { id: 'claude-haiku-3.5', name: 'Claude Haiku 3.5', context: 200_000, inputPrice: 0.80, outputPrice: 4, description: 'Fast and cheap' },
    ],
    features: ['api-key-required', 'streaming'],
  },
  google: {
    name: 'Google Gemini',
    icon: '🔵',
    color: 'blue',
    description: 'Gemini 2.5 Pro, Flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', context: 1_000_000, inputPrice: 1.25, outputPrice: 10, description: 'Most capable Gemini' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', context: 1_000_000, inputPrice: 0.15, outputPrice: 0.60, description: 'Fast and affordable' },
    ],
    features: ['api-key-required', 'streaming', 'multimodal'],
  },
  openrouter: {
    name: 'OpenRouter',
    icon: '🟣',
    color: 'purple',
    description: 'Unified API for 100+ models',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [],
    features: ['api-key-required', 'aggregator'],
  },
  lmstudio: {
    name: 'LM Studio',
    icon: '🖥️',
    color: 'slate',
    description: 'Local model inference GUI',
    baseUrl: 'http://localhost:1234',
    models: [],
    features: ['local', 'gui'],
  },
} as const;

export const PROVIDER_TYPES = Object.keys(PROVIDERS) as string[];

export const PROVIDER_DEFAULTS = Object.fromEntries(
  Object.entries(PROVIDERS).map(([key, p]) => [key, { baseUrl: p.baseUrl, models: p.models.map((m) => m.id) }])
) as Record<string, { baseUrl: string; models: string[] }>;

// ──────────────────────────────────────────────
// System Prompts
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// Activity Actions
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// Agent Modes
// ──────────────────────────────────────────────

export const AGENT_MODES = ['build', 'plan', 'explore', 'general'] as const;

export const AGENT_MODE_LABELS: Record<string, string> = {
  build: 'Build',
  plan: 'Plan',
  explore: 'Explore',
  general: 'General',
};
