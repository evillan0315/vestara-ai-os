import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface VestaraConfig {
  port: number;
  database: string;
  logLevel: string;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  ollama: {
    baseUrl: string;
    autoStart: boolean;
  };
  ai: {
    defaultProvider: string;
    defaultModel: string;
    maxTokens: number;
    temperature: number;
  };
}

const defaults: VestaraConfig = {
  port: 3000,
  database: join(process.env.HOME || '/home/ai', 'vestara/data/vestara.db'),
  logLevel: 'info',
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  },
  ollama: {
    baseUrl: 'http://localhost:11434',
    autoStart: false,
  },
  ai: {
    defaultProvider: 'opencode',
    defaultModel: 'opencode/deepseek-v4-flash-free',
    maxTokens: 4096,
    temperature: 0.7,
  },
};

function loadConfigFile(): Partial<VestaraConfig> {
  const configPath = join(process.env.HOME || '/home/ai', 'vestara/config.toml');
  if (!existsSync(configPath)) return {};
  try {
    const content = readFileSync(configPath, 'utf-8');
    return parseToml(content);
  } catch {
    return {};
  }
}

function parseToml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split('\n');
  let currentSection = result;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const sectionMatch = trimmed.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      const path = sectionMatch[1].split('.');
      currentSection = result;
      for (const key of path) {
        if (!currentSection[key]) currentSection[key] = {};
        currentSection = currentSection[key] as Record<string, unknown>;
      }
      continue;
    }

    const kvMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      if (value === 'true') currentSection[key] = true;
      else if (value === 'false') currentSection[key] = false;
      else if (/^\d+$/.test(value)) currentSection[key] = parseInt(value, 10);
      else if (/^\d+\.\d+$/.test(value)) currentSection[key] = parseFloat(value);
      else currentSection[key] = value.replace(/^["']|["']$/g, '');
    }
  }

  return result;
}

function loadEnvConfig(): Partial<VestaraConfig> {
  const config: Partial<VestaraConfig> = {};

  if (process.env.PORT) config.port = parseInt(process.env.PORT, 10);
  if (process.env.DATABASE) config.database = process.env.DATABASE;
  if (process.env.LOG_LEVEL) config.logLevel = process.env.LOG_LEVEL;
  if (process.env.OLLAMA_BASE_URL) {
    config.ollama = { ...defaults.ollama, baseUrl: process.env.OLLAMA_BASE_URL };
  }
  if (process.env.AI_DEFAULT_PROVIDER) {
    config.ai = { ...defaults.ai, defaultProvider: process.env.AI_DEFAULT_PROVIDER };
  }
  if (process.env.AI_DEFAULT_MODEL) {
    config.ai = { ...config.ai, ...defaults.ai, defaultModel: process.env.AI_DEFAULT_MODEL };
  }

  return config;
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object'
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>,
      );
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

let _config: VestaraConfig | null = null;

export function getConfig(): VestaraConfig {
  if (_config) return _config;

  const fileConfig = loadConfigFile() as Record<string, unknown>;
  const envConfig = loadEnvConfig() as Record<string, unknown>;

  const merged: any = deepMerge(
    deepMerge(defaults as unknown as Record<string, unknown>, fileConfig),
    envConfig,
  );

  _config = merged;

  return _config!;
}

export function resetConfig(): void {
  _config = null;
}
