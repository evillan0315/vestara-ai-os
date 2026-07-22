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

import { execSync, exec, spawn, ChildProcess } from 'node:child_process';
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

function getApiKeyEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  if (process.env.OPENCODE_API_KEY) env.OPENCODE_API_KEY = process.env.OPENCODE_API_KEY;
  if (process.env.OPENCODE_BASE_URL) env.OPENCODE_BASE_URL = process.env.OPENCODE_BASE_URL;
  if (process.env.NVIDIA_API_KEY) env.NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
  if (process.env.VERCEL_AI_GATEWAY_API_KEY) env.VERCEL_AI_GATEWAY_API_KEY = process.env.VERCEL_AI_GATEWAY_API_KEY;
  return env;
}

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
    execSync('which opencode', { stdio: 'pipe', shell: '/usr/bin/sh' });
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
    const output = execSync('opencode --version', { stdio: 'pipe', shell: '/usr/bin/sh' }).toString().trim();
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
    shell: '/usr/bin/sh',
    env: {
      ...process.env,
      ...getApiKeyEnv(),
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
 * Send a prompt and stream the response back via a callback with fallback support
 */
export async function sendPromptStream(
  prompt: string,
  onToken: (token: string) => void,
  opts: {
    model?: string;
    cwd?: string;
    agent?: 'build' | 'plan' | 'general' | 'explore';
    customInstructions?: string;
    webSearch?: boolean;
    fallbackModels?: string[];
  } = {},
): Promise<string> {
  const { cwd = config.workDir, agent = 'build', customInstructions, webSearch, fallbackModels } = opts;

  const fullPrompt = customInstructions
    ? `[Custom Instructions: ${customInstructions}]\n\n${prompt}`
    : prompt;

  const models = [opts.model || 'opencode/deepseek-v4-flash-free', ...(fallbackModels || [])];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      if (isServerRunning()) {
        return await sendPromptViaServerStream(fullPrompt, onToken, { model, cwd, agent, webSearch });
      }
      const full = await sendPromptViaCLI(fullPrompt, { model, cwd, agent });
      onToken(full);
      return full;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (models.length > 1) {
        onToken(`\n\n[Model ${model} failed, trying fallback...]\n\n`);
      }
    }
  }

  throw lastError || new Error('All models failed');
}

/**
 * Send prompt via OpenCode server with streaming
 */
async function sendPromptViaServerStream(
  prompt: string,
  onToken: (token: string) => void,
  opts: { model?: string; cwd?: string; agent?: string; webSearch?: boolean },
): Promise<string> {
  const body: Record<string, unknown> = {
    message: prompt,
    model: opts.model,
    cwd: opts.cwd,
    agent: opts.agent,
  };
  if (opts.webSearch) {
    body.tools = [{ name: 'web_search' }];
  }

  const res = await fetch(`http://localhost:${config.port}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`OpenCode server error: ${res.status} ${res.statusText}`);
  }

  if (!res.body) {
    const data = await res.json() as { response?: string };
    const full = data.response || '';
    onToken(full);
    return full;
  }

  const decoder = new TextDecoder();
  const reader = res.body.getReader();
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    full += chunk;
    onToken(chunk);
  }

  return full;
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
    const cmd = `opencode run "${prompt.replace(/"/g, '\\"')}"${opts.model ? ` --model ${opts.model}` : ''}`;
    exec(
      cmd,
      {
        cwd: opts.cwd || config.workDir,
        timeout: 120000,
        shell: '/usr/bin/sh',
        env: {
          ...process.env,
          ...getApiKeyEnv(),
          OPENCODE_MODEL: opts.model || '',
        },
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(error.message));
          return;
        }
        if (stderr) {
          logger.warn(`OpenCode CLI stderr: ${stderr}`);
        }
        resolve(stdout);
      },
    );
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
    { id: 'opencode/deepseek-v4-flash-free', name: 'DeepSeek V4 Flash (Free)', provider: 'opencode' },
    { id: 'opencode/mimo-v2.5-free', name: 'Mimo V2.5 (Free)', provider: 'opencode' },
    { id: 'opencode/nemotron-3-ultra-free', name: 'Nemotron 3 Ultra (Free)', provider: 'opencode' },
    { id: 'opencode/north-mini-code-free', name: 'North Mini Code (Free)', provider: 'opencode' },
    { id: 'opencode/big-pickle', name: 'Big Pickle', provider: 'opencode' },
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
