import "dotenv/config";

import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import {
  apiRoutes,
  createGenerationInputSchema,
  demoGenerationPromptConfig,
  shotTypeSchema,
} from "@superava/shared";
import Fastify from "fastify";
import { prisma } from "./db.js";
import { startQueue, stopQueue } from "./queue.js";
import { createGeneration, listGenerations } from "./services/generation.js";
import {
  getOrCreateDevUser,
  getOrCreateProfile,
  toApiProfile,
  uploadProfileShot,
} from "./services/profile.js";
import { ensureBucket, getObject } from "./storage.js";

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});
await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

app.get(apiRoutes.health, async () => {
  const templateCount = await prisma.promptTemplate.count();

  return {
    ok: true,
    service: "superava-api",
    provider: "gemini-developer-api",
    templateCount,
  };
});

app.get(apiRoutes.profile, async () => {
  const user = await getOrCreateDevUser();
  const profile = await getOrCreateProfile(user.id);

  return toApiProfile(profile);
});

app.get(apiRoutes.templates, async () => {
  const items = await prisma.promptTemplate.findMany({
    orderBy: [{ group: "asc" }, { title: "asc" }],
  });

  return {
    items,
  };
});

app.get(apiRoutes.generationPromptConfig, async () => {
  const config = await prisma.appConfig.findUnique({
    where: { id: "default" },
  });

  return {
    basePrompt: config?.baseGenerationPrompt ?? demoGenerationPromptConfig.basePrompt,
  };
});

app.get(apiRoutes.generations, async () => {
  const user = await getOrCreateDevUser();

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

  const user = await getOrCreateDevUser();
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

  const buffer = await getObject(asset.storageKey);

  reply.header("content-type", asset.mimeType || "image/png");
  reply.header("cache-control", "public, max-age=3600");
  return reply.send(buffer);
});

app.post(apiRoutes.generations, async (request, reply) => {
  const parseResult = createGenerationInputSchema.safeParse(request.body);

  if (!parseResult.success) {
    return reply.status(400).send({
      error: "invalid_generation_payload",
      issues: parseResult.error.issues,
    });
  }

  try {
    const user = await getOrCreateDevUser();
    const input = parseResult.data;
    const { jobId, requestId } = await createGeneration(user.id, input);

    return reply.status(202).send({
      accepted: true,
      jobId,
      requestId,
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: error instanceof Error ? error.message : "generation_create_failed",
    });
  }
});

app.post("/api/v1/profile/shots/:shotType", async (request, reply) => {
  const paramsSchema = shotTypeSchema;
  const parseResult = paramsSchema.safeParse((request.params as { shotType?: string }).shotType);

  if (!parseResult.success) {
    return reply.status(400).send({
      error: "invalid_shot_type",
      issues: parseResult.error.issues,
    });
  }

  const file = await request.file();

  if (!file) {
    return reply.status(400).send({
      error: "missing_file",
    });
  }

  const buffer = await file.toBuffer();
  const user = await getOrCreateDevUser();
  const profile = await getOrCreateProfile(user.id);
  const result = await uploadProfileShot(profile.id, parseResult.data, buffer);

  if (!result.ok) {
    return reply.status(400).send({
      error: result.error ?? "upload_failed",
    });
  }

  const updatedProfile = await getOrCreateProfile(user.id);

  return reply.status(201).send({
    ok: true,
    profile: toApiProfile(updatedProfile),
  });
});

app.get("/api/v1/profile/shots/:shotType/preview", async (request, reply) => {
  const parseResult = shotTypeSchema.safeParse(
    (request.params as { shotType?: string }).shotType
  );

  if (!parseResult.success) {
    return reply.status(400).send({
      error: "invalid_shot_type",
      issues: parseResult.error.issues,
    });
  }

  const user = await getOrCreateDevUser();
  const profile = await getOrCreateProfile(user.id);
  const shot = profile.shots.find((item) => item.shotType === parseResult.data);

  if (!shot?.previewKey) {
    return reply.status(404).send({
      error: "preview_not_found",
    });
  }

  const buffer = await getObject(shot.previewKey);

  reply.header("content-type", "image/jpeg");
  reply.header("cache-control", "public, max-age=3600");
  return reply.send(buffer);
});

const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? "0.0.0.0";

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

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await stopQueue().catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  });
}
