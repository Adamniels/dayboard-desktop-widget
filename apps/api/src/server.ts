// Minimal Phase 0 api: a health route and an empty WebSocket endpoint. No business
// endpoints yet; Phase 1 adds REST CRUD and the live broadcast over this same channel.
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { env } from "./env";
import { addClient, clientCount } from "./ws";

export async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(websocket);

  app.get("/health", async () => ({ status: "ok", clients: clientCount() }));

  // Connection only in Phase 0: accept the socket, track it, log it. Nothing is pushed.
  app.register(async (instance) => {
    instance.get("/ws", { websocket: true }, (socket) => {
      addClient(socket);
      instance.log.info({ clients: clientCount() }, "display connected");
    });
  });

  return app;
}

async function main() {
  const app = await buildServer();
  try {
    await app.listen({ port: env.port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Run only when executed directly (not when imported by a test).
if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
