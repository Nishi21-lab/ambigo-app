import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { Server as SocketIOServer } from "socket.io";
import { createServer } from "node:http";

import { connectToDatabase } from "./db/connection.js";
import { logger } from "./middleware/logger.js";
import tripRoutes from "./routes/tripRoutes.js";
import { requestRouter } from "./routes/requestRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { setupSocketHandlers } from "./services/socketService.js";

const app = new Hono();
const PORT = Number(process.env.PORT) || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ── Middleware ─────────────────────────────────────────────────
app.use("*", logger);
app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*", // Reflect the request origin so Authorization headers work
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Explicitly handle preflight OPTIONS for all routes
app.options("*", (c) => {
  return c.body(null, 204);
});

// ── Health Check ───────────────────────────────────────────────
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// ── API Routes ─────────────────────────────────────────────────
app.route("/api/auth", authRoutes);
app.route("/api/trips", tripRoutes);
app.route("/api/requests", requestRouter);
app.route("/api/vehicles", vehicleRoutes);

// ── 404 ────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: "Route not found." }, 404));

// ── Bootstrap ─────────────────────────────────────────────────
async function bootstrap() {
  await connectToDatabase();

  // Attach Hono as the request listener and capture the returned server instance
  const server = serve({ fetch: app.fetch, port: PORT, hostname: "0.0.0.0" }, (info) => {
    console.log(`[Server] Listening on port ${info.port}`);
  });

  // Attach Socket.io to the SAME server instance so they share the port
  const io = new SocketIOServer(server as any, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  setupSocketHandlers(io);
}

bootstrap().catch((err) => {
  console.error("[Bootstrap] Fatal error:", err);
  process.exit(1);
});
