import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import {
  adminUserSchema,
  billingPricingSchema,
  type AuthUser,
  authUserSchema,
  apiRoutes,
  billingAccountSchema,
  createGenerationInputSchema,
  demoGenerationPromptConfig,
  generationQuoteSchema,
  shotTypeSchema,
  userRoleSchema,
  userStatusSchema,
} from "@superava/shared";
import Fastify, { type FastifyRequest } from "fastify";
import { prisma } from "./db.js";
import { startQueue, stopQueue } from "./queue.js";
import { createGeneration, listGenerations } from "./services/generation.js";
import {
  getBillingAccountSummary,
  getBillingPricing,
  quoteGeneration,
} from "./services/billing.js";
import {
  getOrCreateProfile,
  toApiProfile,
  uploadProfileShot,
} from "./services/profile.js";
import { validateImage } from "./image-pipeline.js";
import {
  categoryPreviewKey,
  checkBucketAccess,
  ensureBucket,
  getObject,
  putObject,
  referencePhotoKey,
  templatePreviewKey,
} from "./storage.js";
import {
  deleteUserSession,
  createUserSession,
  getUserFromSession,
  SESSION_COOKIE,
} from "./auth/session.js";
import {
  registerAndCreateSession,
  loginAndCreateSession,
  resetUserPassword,
} from "./auth/user-auth.js";
import {
  checkAuthRateLimit,
  clearAuthRateLimit,
  recordAuthFailure,
} from "./auth/rate-limit.js";
import { appConfig } from "./config.js";
import {
  createEmailVerificationToken,
  createPasswordResetToken,
  consumePasswordResetToken,
  verifyEmailToken,
} from "./auth/token-service.js";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "./auth/email.js";

const app = Fastify({
  logger: true,
  trustProxy: appConfig.trustProxy,
});

await app.register(cookie, {
  secret: appConfig.sessionSecret,
});
await app.register(helmet, {
  global: true,
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
});
await app.register(cors, {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    callback(null, appConfig.webOrigins.includes(origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
});
await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

const sessionCookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: appConfig.isProduction,
  maxAge: appConfig.sessionMaxAgeSeconds,
};

// --- User Auth ---
app.post("/api/v1/auth/register", async (request, reply) => {
  const body = request.body as { email?: string; password?: string };
  const rateLimit = await checkAuthRateLimit("register", request, body?.email);
  if (!rateLimit.ok) {
    return reply.status(429).send({
      error: "too_many_attempts",
      retryAfter: rateLimit.retryAfter,
    });
  }
  if (!body?.email || !body?.password) {
    await recordAuthFailure("register", request, body?.email);
    return reply.status(400).send({ error: "email_and_password_required" });
  }
  const result = await registerAndCreateSession(body.email, body.password);
  if (!result.ok) {
    await recordAuthFailure("register", request, body.email);
    return reply.status(400).send({ error: result.error });
  }
  await clearAuthRateLimit("register", request, body.email);
  reply.setCookie(SESSION_COOKIE, result.token!, sessionCookieOptions);

  let debugVerifyUrl: string | undefined;
  try {
    const user = await prisma.user.findUnique({
      where: { email: body.email.trim().toLowerCase() },
      select: { id: true, email: true },
    });
    if (user?.email) {
      const token = await createEmailVerificationToken(user.id);
      const sent = await sendVerificationEmail(user.email, token);
      debugVerifyUrl = sent.debugUrl;
    }
  } catch (error) {
    request.log.error(error);
  }

  return reply.send({ ok: true, debugVerifyUrl });
});

app.post("/api/v1/auth/login", async (request, reply) => {
  const body = request.body as { email?: string; password?: string };
  const rateLimit = await checkAuthRateLimit("login", request, body?.email);
  if (!rateLimit.ok) {
    return reply.status(429).send({
      error: "too_many_attempts",
      retryAfter: rateLimit.retryAfter,
    });
  }
  if (!body?.email || !body?.password) {
    await recordAuthFailure("login", request, body?.email);
    return reply.status(400).send({ error: "email_and_password_required" });
  }
  const result = await loginAndCreateSession(body.email, body.password);
  if (!result.ok) {
    await recordAuthFailure("login", request, body.email);
    return reply
      .status(result.error === "account_blocked" ? 403 : 401)
      .send({ error: result.error });
  }
  await clearAuthRateLimit("login", request, body.email);
  reply.setCookie(SESSION_COOKIE, result.token!, sessionCookieOptions);
  return reply.send({ ok: true });
});

app.post("/api/v1/auth/logout", async (request, reply) => {
  const token = (request.cookies as Record<string, string>)?.[SESSION_COOKIE];
  if (token) {
    await deleteUserSession(token);
  }
  reply.clearCookie(SESSION_COOKIE, { path: "/" });
  return reply.send({ ok: true });
});

app.post("/api/v1/auth/forgot-password", async (request, reply) => {
  const body = request.body as { email?: string };
  const email = body?.email?.trim().toLowerCase();
  if (!email) {
    return reply.status(400).send({ error: "email_required" });
  }

  let debugResetUrl: string | undefined;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, status: true },
    });

    if (user?.email && user.status === "ACTIVE") {
      const token = await createPasswordResetToken(user.id);
      const sent = await sendPasswordResetEmail(user.email, token);
      debugResetUrl = sent.debugUrl;
    }
  } catch (error) {
    request.log.error(error);
  }

  return reply.send({ ok: true, debugResetUrl });
});

app.post("/api/v1/auth/reset-password", async (request, reply) => {
  const body = request.body as { token?: string; password?: string };
  if (!body?.token || !body?.password) {
    return reply.status(400).send({ error: "token_and_password_required" });
  }

  const consumed = await consumePasswordResetToken(body.token);
  if (!consumed.ok) {
    return reply
      .status(consumed.error === "account_blocked" ? 403 : 400)
      .send({ error: consumed.error });
  }

  const reset = await resetUserPassword(consumed.userId, body.password);
  if (!reset.ok) {
    return reply.status(400).send({ error: reset.error });
  }

  const token = await createUserSession(consumed.userId);
  reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions);
  return reply.send({ ok: true });
});

app.post("/api/v1/auth/verify-email", async (request, reply) => {
  const body = request.body as { token?: string };
  if (!body?.token) {
    return reply.status(400).send({ error: "token_required" });
  }

  const result = await verifyEmailToken(body.token);
  if (!result.ok) {
    return reply.status(400).send({ error: result.error });
  }

  return reply.send({ ok: true });
});

app.post("/api/v1/auth/resend-verification", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  if (!user.email) {
    return reply.status(400).send({ error: "email_required" });
  }
  if (user.emailVerified) {
    return reply.status(400).send({ error: "already_verified" });
  }

  try {
    const token = await createEmailVerificationToken(user.id);
    const sent = await sendVerificationEmail(user.email, token);
    return reply.send({ ok: true, debugVerifyUrl: sent.debugUrl });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "verification_email_send_failed" });
  }
});

app.get("/api/v1/auth/me", async (request, reply) => {
  const user = await getUserFromSession(request);
  if (!user) {
    return reply.status(401).send({ error: "unauthorized" });
  }
  return reply.send(authUserSchema.parse(user));
});

app.get("/api/v1/billing/me", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  return reply.send(billingAccountSchema.parse(await getBillingAccountSummary(user.id)));
});

app.get("/api/v1/billing/pricing", async () => {
  return billingPricingSchema.parse(await getBillingPricing());
});

app.get(apiRoutes.health, async () => {
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
  };
});

async function requireUser(
  request: FastifyRequest,
  reply: { status: (code: number) => { send: (body: unknown) => unknown } }
): Promise<AuthUser | null> {
  const user = await getUserFromSession(request);
  if (!user) {
    reply.status(401).send({ error: "unauthorized" });
    return null;
  }
  return user;
}

async function requireAdmin(
  request: FastifyRequest,
  reply: { status: (code: number) => { send: (body: unknown) => unknown } }
): Promise<boolean> {
  const user = await requireUser(request, reply);
  if (!user) {
    return false;
  }
  if (user.role !== "ADMIN") {
    reply.status(403).send({ error: "forbidden" });
    return false;
  }
  return true;
}

app.get("/api/v1/admin/auth/me", async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) {
    return;
  }
  if (user.role !== "ADMIN") {
    return reply.status(403).send({ error: "forbidden" });
  }
  return reply.send(authUserSchema.parse(user));
});

app.get(apiRoutes.profile, async (request, reply) => {
  const user = await requireUser(request, reply);
  if (!user) return;
  const profile = await getOrCreateProfile(user.id);
  return toApiProfile(profile);
});

app.get(apiRoutes.templates, async () => {
  const items = await prisma.promptTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ categoryId: "asc" }, { group: "asc" }, { title: "asc" }],
    include: { category: true },
  });

  return {
    items: items.map((t) => ({
      ...t,
      categoryId: t.categoryId,
      previewKey: t.previewKey,
    })),
  };
});

app.get("/api/v1/categories", async () => {
  const items = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return { items };
});

app.get("/api/v1/categories/:id/preview", async (request, reply) => {
  const id = (request.params as { id?: string }).id;
  if (!id) return reply.status(400).send({ error: "id required" });
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat?.previewKey) return reply.status(404).send({ error: "preview_not_found" });
  const buffer = await getObject(cat.previewKey);
  reply.header("content-type", "image/jpeg");
  reply.header("cache-control", "public, max-age=3600");
  return reply.send(buffer);
});

app.get("/api/v1/templates/:id/preview", async (request, reply) => {
  const id = (request.params as { id?: string }).id;
  if (!id) return reply.status(400).send({ error: "id required" });
  const tpl = await prisma.promptTemplate.findUnique({ where: { id } });
  if (!tpl?.previewKey) return reply.status(404).send({ error: "preview_not_found" });
  const buffer = await getObject(tpl.previewKey);
  reply.header("content-type", "image/jpeg");
  reply.header("cache-control", "public, max-age=3600");
  return reply.send(buffer);
});

app.get("/api/v1/config/prompt-constructor", async () => {
  const [parts, config] = await Promise.all([
    prisma.promptPart.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.appConfig.findUnique({ where: { id: "default" } }),
  ]);
  return {
    parts,
    shortPromptMaxChars: config?.shortPromptMaxChars ?? 80,
    shortPromptMaxWords: config?.shortPromptMaxWords ?? 6,
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

  const buffer = await getObject(asset.storageKey);

  reply.header("content-type", asset.mimeType || "image/png");
  reply.header("cache-control", "public, max-age=3600");
  return reply.send(buffer);
});

// --- Admin: Categories ---
app.get("/api/v1/admin/categories", async (request, reply) => {
  if (!(await requireAdmin(request, reply))) return;
  const items = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return { items };
});

app.post("/api/v1/admin/categories", async (request, reply) => {
  if (!(await requireAdmin(request, reply))) return;
  const body = request.body as { name?: string; sortOrder?: number };
  if (!body?.name || typeof body.name !== "string") {
    return reply.status(400).send({ error: "name required" });
  }
  const created = await prisma.category.create({
    data: {
      name: body.name,
      sortOrder: body.sortOrder ?? 0,
    },
  });
  return reply.status(201).send(created);
});

app.patch("/api/v1/admin/categories/:id", async (request, reply) => {
  if (!(await requireAdmin(request, reply))) return;
  const id = (request.params as { id?: string }).id;
  if (!id) return reply.status(400).send({ error: "id required" });
  const body = request.body as { name?: string; previewKey?: string; sortOrder?: number };
  const data: Record<string, unknown> = {};
  if (typeof body?.name === "string") data.name = body.name;
  if (typeof body?.previewKey === "string") data.previewKey = body.previewKey;
  if (typeof body?.sortOrder === "number") data.sortOrder = body.sortOrder;
  const updated = await prisma.category.update({
    where: { id },
    data,
  });
  return reply.send(updated);
});

app.post("/api/v1/admin/categories/:id/preview", async (request, reply) => {
  if (!(await requireAdmin(request, reply))) return;
  const id = (request.params as { id?: string }).id;
  if (!id) return reply.status(400).send({ error: "id required" });
  const file = await request.file();
  if (!file) return reply.status(400).send({ error: "missing_file" });
  const buffer = await file.toBuffer();
  const validation = await validateImage(buffer);
  if (!validation.ok) return reply.status(400).send({ error: validation.error ?? "invalid_image" });
  const key = categoryPreviewKey(id);
  await putObject(key, buffer, "image/jpeg");
  const updated = await prisma.category.update({
    where: { id },
    data: { previewKey: key },
  });
  return reply.status(201).send(updated);
});

app.delete("/api/v1/admin/categories/:id", async (request, reply) => {
  if (!(await requireAdmin(request, reply))) return;
  const id = (request.params as { id?: string }).id;
  if (!id) return reply.status(400).send({ error: "id required" });
  await prisma.category.delete({ where: { id } });
  return reply.status(204).send();
});

// --- Admin: Templates ---
app.get("/api/v1/admin/templates", async (request, reply) => {
  if (!(await requireAdmin(request, reply))) return;
  const items = await prisma.promptTemplate.findMany({
    orderBy: [{ categoryId: "asc" }, { title: "asc" }],
    include: { category: true },
  });
  return { items };
});

app.post("/api/v1/admin/templates", async (request, reply) => {
  if (!(await requireAdmin(request, reply))) return;
  const body = request.body as {
    slug?: string;
    title?: string;
    subtitle?: string;
    group?: string;
    previewLabel?: string;
    description?: string;
    promptSkeleton?: string;
    categoryId?: string | null;
    priceMinor?: number;
    isActive?: boolean;
  };
  if (!body?.slug || !body?.title) {
    return reply.status(400).send({ error: "slug and title required" });
  }
  const created = await prisma.promptTemplate.create({
    data: {
      slug: body.slug,
      title: body.title,
      subtitle: body.subtitle ?? "",
      group: body.group ?? "holiday",
      previewLabel: body.previewLabel ?? "",
      description: body.description ?? "",
      promptSkeleton: body.promptSkeleton ?? "",
      categoryId: body.categoryId ?? null,
      priceMinor: Math.max(0, body.priceMinor ?? 0),
      isActive: body.isActive ?? true,
    },
  });
  return reply.status(201).send(created);
});

app.patch("/api/v1/admin/templates/:id", async (request, reply) => {
  if (!(await requireAdmin(request, reply))) return;
  const id = (request.params as { id?: string }).id;
  if (!id) return reply.status(400).send({ error: "id required" });
  const body = request.body as {
    slug?: string;
    title?: string;
    subtitle?: string;
    group?: string;
    previewLabel?: string;
    description?: string;
    promptSkeleton?: string;
    categoryId?: string | null;
    previewKey?: string;
    priceMinor?: number;
    isActive?: boolean;
  };
  const data: Record<string, unknown> = {};
  const fields = [
    "slug",
    "title",
    "subtitle",
    "group",
    "previewLabel",
    "description",
    "promptSkeleton",
    "categoryId",
    "previewKey",
    "isActive",
  ] as const;
  for (const f of fields) {
    if (body?.[f] !== undefined) data[f] = body[f];
  }
  if (typeof body?.priceMinor === "number") {
    data.priceMinor = Math.max(0, body.priceMinor);
  }
  const updated = await prisma.promptTemplate.update({
    where: { id },
    data,
  });
  return reply.send(updated);
});

app.post("/api/v1/admin/templates/:id/preview", async (request, reply) => {
  if (!(await requireAdmin(request, reply))) return;
  const id = (request.params as { id?: string }).id;
  if (!id) return reply.status(400).send({ error: "id required" });
  const file = await request.file();
  if (!file) return reply.status(400).send({ error: "missing_file" });
  const buffer = await file.toBuffer();
  const validation = await validateImage(buffer);
  if (!validation.ok) return reply.status(400).send({ error: validation.error ?? "invalid_image" });
  const key = templatePreviewKey(id);
  await putObject(key, buffer, "image/jpeg");
  const updated = await prisma.promptTemplate.update({
    where: { id },
    data: { previewKey: key },
  });
  return reply.status(201).send(updated);
});

app.delete("/api/v1/admin/templates/:id", async (request, reply) => {
  if (!(await requireAdmin(request, reply))) return;
  const id = (request.params as { id?: string }).id;
  if (!id) return reply.status(400).send({ error: "id required" });
  await prisma.promptTemplate.delete({ where: { id } });
  return reply.status(204).send();
});

// --- Admin: Prompt Parts ---
app.get("/api/v1/admin/prompt-parts", async (request, reply) => {
  if (!(await requireAdmin(request, reply))) return;
  const items = await prisma.promptPart.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return { items };
});

app.patch("/api/v1/admin/prompt-parts/:key", async (request, reply) => {
  if (!(await requireAdmin(request, reply))) return;
  const key = (request.params as { key?: string }).key;
  if (!key) return reply.status(400).send({ error: "key required" });
  const body = request.body as { label?: string; value?: string; sortOrder?: number };
  const data: Record<string, unknown> = {};
  if (typeof body?.label === "string") data.label = body.label;
  if (typeof body?.value === "string") data.value = body.value;
  if (typeof body?.sortOrder === "number") data.sortOrder = body.sortOrder;
  const updated = await prisma.promptPart.update({
    where: { key },
    data,
  });
  return reply.send(updated);
});

app.get("/api/v1/admin/app-config", async (request, reply) => {
  if (!(await requireAdmin(request, reply))) return;
  const config = await prisma.appConfig.findUnique({
    where: { id: "default" },
  });

  return {
    id: "default",
    billingEnabled: config?.billingEnabled ?? false,
    textGenerationPriceMinor: config?.textGenerationPriceMinor ?? 0,
    photoGenerationPriceMinor: config?.photoGenerationPriceMinor ?? 0,
    currency: config?.currency ?? "RUB",
  };
});

app.patch("/api/v1/admin/app-config", async (request, reply) => {
  if (!(await requireAdmin(request, reply))) return;
  const body = request.body as {
    billingEnabled?: boolean;
    textGenerationPriceMinor?: number;
    photoGenerationPriceMinor?: number;
  };
  const data: Record<string, unknown> = {};
  if (typeof body?.billingEnabled === "boolean") data.billingEnabled = body.billingEnabled;
  if (typeof body?.textGenerationPriceMinor === "number") {
    data.textGenerationPriceMinor = Math.max(0, body.textGenerationPriceMinor);
  }
  if (typeof body?.photoGenerationPriceMinor === "number") {
    data.photoGenerationPriceMinor = Math.max(0, body.photoGenerationPriceMinor);
  }

  const updated = await prisma.appConfig.upsert({
    where: { id: "default" },
    update: data,
    create: {
      id: "default",
      baseGenerationPrompt: demoGenerationPromptConfig.basePrompt,
      billingEnabled: typeof body?.billingEnabled === "boolean" ? body.billingEnabled : false,
      textGenerationPriceMinor: Math.max(0, body?.textGenerationPriceMinor ?? 0),
      photoGenerationPriceMinor: Math.max(0, body?.photoGenerationPriceMinor ?? 0),
      currency: "RUB",
    },
  });

  return reply.send({
    id: updated.id,
    billingEnabled: updated.billingEnabled,
    textGenerationPriceMinor: updated.textGenerationPriceMinor,
    photoGenerationPriceMinor: updated.photoGenerationPriceMinor,
    currency: updated.currency,
  });
});

// --- Admin: Users ---
app.get("/api/v1/admin/users", async (request, reply) => {
  const admin = await requireUser(request, reply);
  if (!admin) return;
  if (admin.role !== "ADMIN") {
    return reply.status(403).send({ error: "forbidden" });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  return {
    items: users.map((user) =>
      adminUserSchema.parse({
        ...user,
        createdAt: user.createdAt.toISOString(),
      })
    ),
  };
});

app.patch("/api/v1/admin/users/:id", async (request, reply) => {
  const admin = await requireUser(request, reply);
  if (!admin) return;
  if (admin.role !== "ADMIN") {
    return reply.status(403).send({ error: "forbidden" });
  }

  const id = (request.params as { id?: string }).id;
  if (!id) return reply.status(400).send({ error: "id required" });

  const body = request.body as { role?: string };
  const parsedRole = userRoleSchema.safeParse(body?.role);
  const parsedStatus = userStatusSchema.safeParse((request.body as { status?: string })?.status);
  if (!parsedRole.success && !parsedStatus.success) {
    return reply.status(400).send({ error: "invalid_role_or_status" });
  }

  if (admin.id === id && parsedRole.success && parsedRole.data !== "ADMIN") {
    return reply.status(400).send({ error: "cannot_demote_self" });
  }
  if (admin.id === id && parsedStatus.success && parsedStatus.data !== "ACTIVE") {
    return reply.status(400).send({ error: "cannot_block_self" });
  }

  const data: { role?: "USER" | "ADMIN"; status?: "ACTIVE" | "BLOCKED" } = {};
  if (parsedRole.success) {
    data.role = parsedRole.data;
  }
  if (parsedStatus.success) {
    data.status = parsedStatus.data;
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  return reply.send(
    adminUserSchema.parse({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
    })
  );
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
  const user = await requireUser(request, reply);
  if (!user) return;
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

  const user = await requireUser(request, reply);
  if (!user) return;
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

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await stopQueue().catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  });
}
