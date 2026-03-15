import { appConfig } from "./config.js";
import { prisma } from "./db.js";
import { startQueue, stopQueue } from "./queue.js";
import { ensureBucket } from "./storage.js";
import { buildApp } from "./app.js";

const app = await buildApp();

async function start() {
  const port = appConfig.apiPort;
  const host = appConfig.apiHost;

  try {
    await prisma.$connect();
    await ensureBucket();
    await startQueue();
    await app.listen({ host, port });
  } catch (error) {
    app.log.error(error);
    await stopQueue().catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
    process.exit(1);
  }
}

await start();

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await stopQueue().catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
    await app.close().catch(() => undefined);
    process.exit(0);
  });
}
