import type { VestaraApp } from './types.js';
import type { WebSocket } from '@fastify/websocket';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export function registerWebSocketHandler(app: VestaraApp) {
  const clients = new Set<WebSocket>();

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

            const blocked = ['rm -rf /', 'mkfs', ':(){', 'dd if=/dev/zero'];
            if (blocked.some((b) => command.includes(b))) {
              socket.send(JSON.stringify({ type: 'terminal:error', id, error: 'Command blocked for safety' }));
              return;
            }

            try {
              const { stdout, stderr } = await execAsync(command, {
                timeout: 30000,
                maxBuffer: 1024 * 1024,
                env: { ...process.env, TERM: 'dumb' },
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
