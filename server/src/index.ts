import { createApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db.js";

async function bootstrap() {
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[server] M/S Sushant Construction API listening on http://localhost:${config.port}`);
    console.log(`[server] Environment: ${config.env}`);
  });

  // Keep Render free-tier PostgreSQL awake — ping every 4 minutes.
  // Render pauses free DBs after ~5 min of inactivity, causing connection errors.
  // This silent ping prevents that without affecting any app logic.
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      // Ignore — server will reconnect automatically on next real request.
    }
  }, 4 * 60 * 1000); // every 4 minutes
}

bootstrap()
  .catch(async (err) => {
    console.error("[server] Failed to start", err);
    await prisma.$disconnect();
    process.exit(1);
  });

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

