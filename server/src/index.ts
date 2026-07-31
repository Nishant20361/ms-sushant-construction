import { createApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db.js";

async function bootstrap() {
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[server] M/S Sushant Construction API listening on http://localhost:${config.port}`);
    console.log(`[server] Environment: ${config.env}`);
  });
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

