import { randomUUID } from "node:crypto";
import { apiRoutes, createGenerationInputSchema, generationQuoteSchema } from "@superava/shared";
import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { createGeneration, listGenerations } from "../services/generation.js";
import { quoteGeneration } from "../services/billing.js";
import { validateImage } from "../image-pipeline.js";
import { putObject, referencePhotoKey } from "../storage.js";
import { requireUser } from "../http/guards.js";
import { getUserFromSession } from "../auth/session.js";
import { sendStoredImage } from "../http/image-response.js";

export async function registerGenerationRoutes(app: FastifyInstance) {
  app.get(apiRoutes.generations, async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    return {
      items: await listGenerations(user.id),
    };
  });

  app.get("/api/v1/generations/:generationId/preview", async (request, reply) => {
    const generationId = (request.params as { generationId?: string }).generationId;

    if (!generationId) {
      return reply.status(400).send({
        error: "missing_generation_id",
      });
    }

    const user = await getUserFromSession(request);
    if (!user) {
      return reply.status(401).send({ error: "unauthorized" });
    }
    const generation = await prisma.generationRequest.findFirst({
      where: {
        id: generationId,
        userId: user.id,
      },
      include: {
        assets: {
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    const asset = generation?.assets[0];

    if (!asset) {
      return reply.status(404).send({
        error: "generation_preview_not_found",
      });
    }

    return sendStoredImage(reply, asset.storageKey, asset.mimeType || "image/png");
  });

  app.post("/api/v1/reference-photos", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const file = await request.file();
    if (!file) return reply.status(400).send({ error: "missing_file" });
    const buffer = await file.toBuffer();
    const validation = await validateImage(buffer);
    if (!validation.ok) return reply.status(400).send({ error: validation.error ?? "invalid_image" });
    const uniqueId = randomUUID();
    const key = referencePhotoKey(uniqueId);
    await putObject(key, buffer, "image/jpeg");
    return reply.status(201).send({ storageKey: key });
  });

  app.post(apiRoutes.generations, async (request, reply) => {
    const parseResult = createGenerationInputSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: "invalid_generation_payload",
        issues: parseResult.error.issues,
      });
    }

    const user = await requireUser(request, reply);
    if (!user) return;

    try {
      const input = parseResult.data;
      const { jobId, requestId, amountMinor, currency, billingStatus } = await createGeneration(
        user.id,
        input
      );

      return reply.status(202).send({
        accepted: true,
        jobId,
        requestId,
        amountMinor,
        currency,
        billingStatus,
      });
    } catch (error) {
      request.log.error(error);
      const status =
        error instanceof Error && error.message === "insufficient_balance" ? 402 : 500;
      return reply.status(status).send({
        error: error instanceof Error ? error.message : "generation_create_failed",
      });
    }
  });

  app.post("/api/v1/generations/quote", async (request, reply) => {
    const parseResult = createGenerationInputSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: "invalid_generation_payload",
        issues: parseResult.error.issues,
      });
    }

    const user = await requireUser(request, reply);
    if (!user) return;

    try {
      const { quote } = await quoteGeneration(parseResult.data);
      return reply.send(generationQuoteSchema.parse(quote));
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "generation_quote_failed",
      });
    }
  });
}
