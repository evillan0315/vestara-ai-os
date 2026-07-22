import type { VestaraApp } from './types.js';
import type { WebSocket } from '@fastify/websocket';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// Expanded set of blocked command patterns to catch destructive operations
const BLOCKED_PATTERNS = [
  /\brm\s+-rf\s+\/\s/,
  /\brm\s+--no-preserve-root\b/,
  /\bmkfs\b/,
  /\bmkfs\.\w+/,
  /\bdd\s+if=\/dev\/zero/,
  /\bdd\s+of=\/dev\//,
  /\b>:\(\s*\)\s*\{/,
  /\b:\(\)\s*\{/,
  /\bfdisk\s+\/dev\//,
  /\bparted\s+\/dev\//,
  /\bmkswap\b/,
  /\bchmod\s+-R\s+0\s+\//,
  /\bchown\s+-R\s+.*\s+\//,
  /\bpv\b.*\/dev\//,
  /\bdd\b/,
  /\bmv\s+\/\s+/,
];

const MAX_COMMAND_LENGTH = 10000;
const MAX_TERMINAL_RATE = 5; // max commands per second per socket

export function registerWebSocketHandler(app: VestaraApp) {
  const clients = new Set<WebSocket>();
  const terminalRateMap = new Map<WebSocket, number[]>();

  function checkTerminalRate(socket: WebSocket): boolean {
    const now = Date.now();
    const timestamps = terminalRateMap.get(socket) || [];
    const recent = timestamps.filter(t => now - t < 1000);
    if (recent.length >= MAX_TERMINAL_RATE) return false;
    recent.push(now);
    terminalRateMap.set(socket, recent);
    return true;
  }

  function isCommandBlocked(command: string): boolean {
    const normalized = command.trim().toLowerCase();
    if (normalized.length > MAX_COMMAND_LENGTH) return true;
    return BLOCKED_PATTERNS.some(pattern => pattern.test(normalized));
  }

  app.get('/ws', { websocket: true }, (socket) => {
    clients.add(socket);

    socket.on('message', async (raw: Buffer | string) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case 'terminal:exec': {
            const { command, id } = msg;

            if (!command || typeof command !== 'string') {
              socket.send(JSON.stringify({ type: 'terminal:error', id, error: 'command is required' }));
              return;
            }

            if (!checkTerminalRate(socket)) {
              socket.send(JSON.stringify({ type: 'terminal:error', id, error: 'Rate limit exceeded. Please wait.' }));
              return;
            }

            if (isCommandBlocked(command)) {
              socket.send(JSON.stringify({ type: 'terminal:error', id, error: 'Command blocked for safety' }));
              return;
            }

            try {
              const { stdout, stderr } = await execAsync(command, {
                timeout: 30000,
                maxBuffer: 1024 * 1024,
                env: { ...process.env, TERM: 'dumb' },
                shell: '/usr/bin/sh',
              });
              socket.send(JSON.stringify({
                type: 'terminal:result',
                id,
                stdout: stdout || '',
                stderr: stderr || '',
                exitCode: 0,
              }));
            } catch (err: any) {
              socket.send(JSON.stringify({
                type: 'terminal:result',
                id,
                stdout: err.stdout || '',
                stderr: err.stderr || err.message || 'Command failed',
                exitCode: err.code || 1,
              }));
            }
            break;
          }

          case 'ping':
            socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            break;

          default:
            console.log('WS unknown message type:', msg.type);
        }
      } catch {
        // Ignore invalid JSON
      }
    });

    socket.on('close', () => {
      clients.delete(socket);
      terminalRateMap.delete(socket);
    });

    // Send welcome message
    socket.send(JSON.stringify({
      type: 'connected',
      message: 'Vestara WebSocket connected',
      timestamp: new Date().toISOString(),
    }));
  });

  // Broadcast to all connected clients
  app.decorate('broadcast', (event: string, data: unknown) => {
    const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    for (const client of clients) {
      if (client.readyState === 1) {
        client.send(message);
      }
    }
  });
}
