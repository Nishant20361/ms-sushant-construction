import type { Server } from "http";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db.js";

let server: Server | null = null;
let keepAliveTimer: NodeJS.Timeout | null = null;
let isShuttingDown = false;

// ---------------------------------------------------------------------------
// Process-level crash prevention: catch unhandled rejections & uncaught exceptions
// ---------------------------------------------------------------------------
process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>) => {
  // Log full diagnostic stack without terminating healthy traffic
  console.error("[server:critical] Unhandled Promise Rejection:", {
    reason: reason instanceof Error ? { message: reason.message, stack: reason.stack } : reason,
    promise,
  });
});

process.on("uncaughtException", (error: Error) => {
  console.error("[server:critical] Uncaught Exception:", {
    message: error.message,
    stack: error.stack,
  });
  // If the error is fatal and process state is compromised, initiate graceful shutdown
  if (!isShuttingDown) {
    void gracefulShutdown("uncaughtException", 1);
  }
});

async function gracefulShutdown(signal: string, exitCode = 0): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[server] Received ${signal}. Starting graceful shutdown...`);

  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }

  // Force exit after 10s if active sockets refuse to close
  const forceTimeout = setTimeout(() => {
    console.error("[server] Graceful shutdown timed out after 10s, forcing exit.");
    process.exit(exitCode || 1);
  }, 10000);
  forceTimeout.unref();

  if (server) {
    await new Promise<void>((resolve) => {
      server?.close((err) => {
        if (err) {
          console.error("[server] Error during server.close():", err);
        } else {
          console.log("[server] HTTP connections closed.");
        }
        resolve();
      });
    });
  }

  try {
    await prisma.$disconnect();
    console.log("[server] Database connection disconnected.");
  } catch (err) {
    console.error("[server] Error disconnecting database:", err);
  }

  clearTimeout(forceTimeout);
  process.exit(exitCode);
}

async function bootstrap() {
  const app = createApp();
  server = app.listen(config.port, () => {
    console.log(`[server] M/S Sushant Construction API listening on http://localhost:${config.port}`);
    console.log(`[server] Environment: ${config.env}`);
  });

  // Keep Render free-tier PostgreSQL awake — ping every 4 minutes.
  // Render pauses free DBs after ~5 min of inactivity, causing connection errors.
  // This silent ping prevents that without affecting any app logic.
  keepAliveTimer = setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      // Ignore — server will reconnect automatically on next real request.
    }
  }, 4 * 60 * 1000); // every 4 minutes
}

bootstrap().catch(async (err) => {
  console.error("[server] Failed to start", err);
  await prisma.$disconnect();
  process.exit(1);
});

process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT", 0);
});

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM", 0);
});

