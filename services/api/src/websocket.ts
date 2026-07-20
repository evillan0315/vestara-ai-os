import type { VestaraApp } from './types.js';
import type { WebSocket } from '@fastify/websocket';

export function registerWebSocketHandler(app: VestaraApp) {
  const clients = new Set<WebSocket>();

  app.get('/ws', { websocket: true }, (socket) => {
    clients.add(socket);

    socket.on('message', (message: Buffer | string) => {
      try {
        const data = JSON.parse(message.toString());
        // Handle incoming messages (subscriptions, etc.)
        console.log('WS message:', data);
      } catch {
        // Ignore invalid JSON
      }
    });

    socket.on('close', () => {
      clients.delete(socket);
    });
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
