import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { appConfig } from "../config.js";
import { checkBucketAccess } from "../storage.js";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return {
      ok: true,
      service: "superava-api",
      uptimeSeconds: Math.round(process.uptime()),
      now: new Date().toISOString(),
      nodeEnv: appConfig.nodeEnv,
    };
  });

  app.get("/ready", async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;

      const checks: Record<string, string> = {
        database: "ok",
      };

      if (appConfig.readinessCheckStorage) {
        await checkBucketAccess();
        checks.storage = "ok";
      } else {
        checks.storage = "skipped";
      }

      if (appConfig.readinessCheckWorker) {
        const threshold = new Date(Date.now() - appConfig.workerHeartbeatTtlMs);
        const worker = await prisma.workerHeartbeat.findFirst({
          where: {
            service: "generation",
            heartbeatAt: {
              gte: threshold,
            },
            status: "ok",
          },
          orderBy: {
            heartbeatAt: "desc",
          },
        });

        if (!worker) {
          throw new Error("worker_unavailable");
        }

        checks.worker = "ok";
      } else {
        checks.worker = "skipped";
      }

      return {
        ok: true,
        checks,
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(503).send({
        ok: false,
        error: error instanceof Error ? error.message : "readiness_failed",
      });
    }
  });
}
