// The WebSocket hub. Phase 0 is connection only: it tracks live sockets and logs
// connect/disconnect. The real broadcast on data change is FR-RT-1 in Phase 1; the
// `broadcast` helper is here so that phase has a seam to push into.
import type { WebSocket } from "@fastify/websocket";

const clients = new Set<WebSocket>();

export function addClient(socket: WebSocket): void {
  clients.add(socket);
  socket.on("close", () => clients.delete(socket));
}

export function clientCount(): number {
  return clients.size;
}

// Reserved for Phase 1 (FR-RT-1): push a JSON message to every connected display.
export function broadcast(message: unknown): void {
  const payload = JSON.stringify(message);
  for (const socket of clients) {
    socket.send(payload);
  }
}
