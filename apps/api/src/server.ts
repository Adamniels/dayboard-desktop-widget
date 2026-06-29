// Minimal Phase 0 api: a health route and an empty WebSocket endpoint. No business
// endpoints yet; Phase 1 adds REST CRUD and the live broadcast over this same channel.
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { env } from "./env";
import { eventRoutes } from "./routes/events";
import { metaRoutes } from "./routes/meta";
import { planningRoutes } from "./routes/planning";
import { reminderRoutes } from "./routes/reminders";
import { startSyncLoop } from "./sync/engine";
import { startScheduler } from "./scheduler/engine";
import { addClient, clientCount } from "./ws";

export async function buildServer() {
  const app = Fastify({ logger: true });

  // The display and admin are served from different origins (Vite on 5173/5174, or the
  // Tailscale host on the Mini), so the browser needs CORS to read api responses. Single
  // user behind Tailscale: reflecting any origin is acceptable here.
  await app.register(cors, { origin: true });
  await app.register(websocket);

  app.get("/health", async () => ({ status: "ok", clients: clientCount() }));

  await app.register(eventRoutes);
  await app.register(metaRoutes);
  await app.register(planningRoutes);
  await app.register(reminderRoutes);

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
    // Start the Google poll loop and the reminder/timer scheduler after the server is up.
    // Started here (not in buildServer) so integration tests can build the app without
    // live background loops.
    startSyncLoop(app.log);
    void startScheduler(app.log);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Run only when executed directly (not when imported by a test).
if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
