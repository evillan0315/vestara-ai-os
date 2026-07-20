/**
 * OpenCode Provider Integration
 *
 * OpenCode is an open-source AI coding agent that supports 75+ LLM providers.
 * It can run as a TUI, desktop app, or headless server.
 *
 * Integration approach:
 * - OpenCode runs as a headless server (`opencode serve`) on port 4096
 * - We proxy requests through our API to OpenCode's HTTP interface
 * - The dashboard can also launch OpenCode sessions directly
 *
 * OpenCode config: ~/.config/opencode/opencode.json
 * OpenCode auth: ~/.local/share/opencode/auth.json
 */

import { execSync, spawn, ChildProcess } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger } from '@vestara/core';

const logger = createLogger('opencode');

export interface OpenCodeConfig {
  /** Path to OpenCode binary */
  binaryPath: string;
  /** Server port (default: 4096) */
  port: number;
  /** Working directory for OpenCode sessions */
  workDir: string;
  /** OpenCode config directory */
  configDir: string;
  /** Auto-start server */
  autoStart: boolean;
}

export interface OpenCodeSession {
  id: string;
  cwd: string;
  model: string;
  status: 'running' | 'stopped' | 'error';
  pid?: number;
}

const DEFAULT_CONFIG: OpenCodeConfig = {
  binaryPath: 'opencode',
  port: 4096,
  workDir: join(process.env.HOME || '/home/ai', 'workspace'),
  configDir: join(process.env.HOME || '/home/ai', '.config/opencode'),
  autoStart: true,
};

let serverProcess: ChildProcess | null = null;
let config: OpenCodeConfig = DEFAULT_CONFIG;

export function configure(opts: Partial<OpenCodeConfig>): void {
  config = { ...DEFAULT_CONFIG, ...opts };
}

export function getConfig(): OpenCodeConfig {
  return config;
}

/**
 * Check if OpenCode is installed
 */
export function isInstalled(): boolean {
  try {
    execSync('which opencode', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get OpenCode version
 */
export function getVersion(): string | null {
  try {
    const output = execSync('opencode --version', { stdio: 'pipe' }).toString().trim();
    return output;
  } catch {
    return null;
  }
}

/**
 * Ensure OpenCode config directory exists
 */
export function ensureConfig(): void {
  if (!existsSync(config.configDir)) {
    mkdirSync(config.configDir, { recursive: true });
  }
}

/**
 * Get OpenCode configuration file path
 */
export function getConfigPath(): string {
  return join(config.configDir, 'opencode.json');
}

/**
 * Read OpenCode configuration
 */
export function readConfig(): Record<string, unknown> {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) return {};
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * Write OpenCode configuration
 */
export function writeConfig(cfg: Record<string, unknown>): void {
  ensureConfig();
  writeFileSync(getConfigPath(), JSON.stringify(cfg, null, 2));
}

/**
 * Get OpenCode auth file path
 */
export function getAuthPath(): string {
  const dataDir = join(process.env.HOME || '/home/ai', '.local/share/opencode');
  return join(dataDir, 'auth.json');
}

/**
 * Check if a provider has credentials configured in OpenCode
 */
export function hasProviderCredentials(providerId: string): boolean {
  const authPath = getAuthPath();
  if (!existsSync(authPath)) return false;

  try {
    const auth = JSON.parse(readFileSync(authPath, 'utf-8'));
    return providerId in auth;
  } catch {
    return false;
  }
}

/**
 * Start OpenCode as a headless server
 */
export async function startServer(): Promise<void> {
  if (serverProcess) {
    logger.info('OpenCode server already running');
    return;
  }

  if (!isInstalled()) {
    throw new Error('OpenCode is not installed. Install with: npm i -g opencode-ai');
  }

  logger.info(`Starting OpenCode server on port ${config.port}`);

  serverProcess = spawn(config.binaryPath, ['serve', '--port', String(config.port)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      OPENCODE_SERVER_PORT: String(config.port),
    },
  });

  serverProcess.stdout?.on('data', (data) => {
    logger.info(`OpenCode: ${data.toString().trim()}`);
  });

  serverProcess.stderr?.on('data', (data) => {
    logger.warn(`OpenCode: ${data.toString().trim()}`);
  });

  serverProcess.on('exit', (code) => {
    logger.info(`OpenCode server exited with code ${code}`);
    serverProcess = null;
  });

  // Wait for server to be ready
  await waitForServer();
}

/**
 * Stop OpenCode server
 */
export function stopServer(): void {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
    logger.info('OpenCode server stopped');
  }
}

/**
 * Check if OpenCode server is running
 */
export function isServerRunning(): boolean {
  return serverProcess !== null;
}

/**
 * Wait for OpenCode server to be ready
 */
async function waitForServer(timeout = 10000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`http://localhost:${config.port}/health`);
      if (res.ok) return;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('OpenCode server failed to start within timeout');
}

/**
 * Send a prompt to OpenCode and get a response
 */
export async function sendPrompt(
  prompt: string,
  opts: {
    model?: string;
    cwd?: string;
    agent?: 'build' | 'plan' | 'general' | 'explore';
  } = {},
): Promise<string> {
  const { model, cwd = config.workDir, agent = 'build' } = opts;

  // Try server mode first
  if (isServerRunning()) {
    return sendPromptViaServer(prompt, { model, cwd, agent });
  }

  // Fallback to CLI mode
  return sendPromptViaCLI(prompt, { model, cwd, agent });
}

/**
 * Send prompt via OpenCode server HTTP API
 */
async function sendPromptViaServer(
  prompt: string,
  opts: { model?: string; cwd?: string; agent?: string },
): Promise<string> {
  const res = await fetch(`http://localhost:${config.port}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: prompt,
      model: opts.model,
      cwd: opts.cwd,
      agent: opts.agent,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenCode server error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json() as { response?: string; output?: string };
  return data.response || data.output || '';
}

/**
 * Send prompt via OpenCode CLI
 */
function sendPromptViaCLI(
  prompt: string,
  opts: { model?: string; cwd?: string; agent?: string },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ['run', prompt];
    if (opts.model) args.push('--model', opts.model);

    const child = execSync(
      `opencode run "${prompt.replace(/"/g, '\\"')}"${opts.model ? ` --model ${opts.model}` : ''}`,
      {
        cwd: opts.cwd || config.workDir,
        stdio: 'pipe',
        timeout: 120000,
        env: {
          ...process.env,
          OPENCODE_MODEL: opts.model || '',
        },
      },
    );

    resolve(child.toString());
  });
}

/**
 * List available models from OpenCode
 */
export async function listModels(): Promise<Array<{ id: string; name: string; provider: string }>> {
  if (isServerRunning()) {
    try {
      const res = await fetch(`http://localhost:${config.port}/models`);
      if (res.ok) {
        const data = await res.json() as { models: Array<{ id: string; name: string; provider: string }> };
        return data.models || [];
      }
    } catch {
      // Fallback to known models
    }
  }

  // Return known OpenCode models
  return [
    { id: 'anthropic/claude-opus-4-5-20251101', name: 'Claude Opus 4.5', provider: 'anthropic' },
    { id: 'anthropic/claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', provider: 'anthropic' },
    { id: 'anthropic/claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', provider: 'anthropic' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openai' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
    { id: 'openai/gpt-5.1-codex', name: 'GPT-5.1 Codex', provider: 'openai' },
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google' },
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google' },
    { id: 'google/gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google' },
  ];
}

/**
 * Get OpenCode status
 */
export function getStatus(): {
  installed: boolean;
  version: string | null;
  serverRunning: boolean;
  configPath: string;
  authPath: string;
} {
  return {
    installed: isInstalled(),
    version: getVersion(),
    serverRunning: isServerRunning(),
    configPath: getConfigPath(),
    authPath: getAuthPath(),
  };
}
