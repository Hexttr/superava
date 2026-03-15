import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env", "../../.env"] });
// Watcher reload marker for local env changes.

import { buildReferenceModePrompt } from "@superava/shared";
import { DEFAULT_GENERATION_BASE_PROMPT, GeminiProviderAdapter } from "@superava/ai-provider";
import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import PgBoss from "pg-boss";
import sharp from "sharp";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { prisma } from "./db.js";
import { ensureBucket, generationAssetKey, getObject, putObject } from "./storage.js";

const provider = new GeminiProviderAdapter();
const connectionString = process.env.DATABASE_URL;
const imageModel = process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-3-pro-image-preview";
const maxRefImages = imageModel.includes("2.5-flash-image") ? 3 : 14;
const workerService = "generation";
const workerId = process.env.WORKER_ID?.trim() || `${hostname()}-${process.pid}`;
const workerStartedAt = new Date();
const heartbeatIntervalMs = Math.max(
  1000,
  Number(process.env.WORKER_HEARTBEAT_INTERVAL_MS ?? "5000")
);
const generationStaleTimeoutMs = Math.max(
  60_000,
  Number(process.env.GENERATION_STALE_TIMEOUT_MS ?? String(45 * 60 * 1000))
);
const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
const proxyUrl =
  process.env.HTTPS_PROXY ??
  process.env.HTTP_PROXY ??
  process.env.ALL_PROXY ??
  undefined;
const proxyDispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
const geminiRequestTimeoutMs = Math.max(
  10_000,
  Number(process.env.GEMINI_REQUEST_TIMEOUT_MS ?? "90000")
);
const geminiRetryCount = Math.max(0, Number(process.env.GEMINI_RETRY_COUNT ?? "2"));

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const boss = new PgBoss({
  connectionString,
  schema: "pgboss",
});
const GENERATION_QUEUE = "generation";
let heartbeatTimer: NodeJS.Timeout | undefined;

function ensureGeminiApiKey() {
  if (!geminiApiKey) {
    throw new Error("gemini_api_key_missing");
  }

  return geminiApiKey;
}

const SHOT_PRIORITY: Record<string, number> = {
  front_neutral: 0,
  front_smile: 1,
  left_45: 2,
  right_45: 3,
  left_profile: 4,
  right_profile: 5,
};

async function captureGenerationCharge(requestId: string) {
  const request = await prisma.generationRequest.findUnique({
    where: { id: requestId },
    include: {
      user: {
        include: {
          billingAccount: true,
        },
      },
    },
  });

  if (
    !request ||
    request.billingStatus !== "RESERVED" ||
    !request.user.billingAccount ||
    request.priceMinor <= 0
  ) {
    return;
  }

  await prisma.$transaction([
    prisma.billingAccount.update({
      where: { id: request.user.billingAccount.id },
      data: {
        reservedMinor: {
          decrement: request.priceMinor,
        },
        balanceMinor: {
          decrement: request.priceMinor,
        },
      },
    }),
    prisma.billingLedgerEntry.create({
      data: {
        accountId: request.user.billingAccount.id,
        userId: request.userId,
        type: "GENERATION_CAPTURE",
        amountMinor: request.priceMinor,
        currency: request.currency,
        generationRequestId: request.id,
        idempotencyKey: `generation-capture:${request.id}`,
        description: "Generation charge captured",
      },
    }),
    prisma.generationRequest.update({
      where: { id: request.id },
      data: {
        billingStatus: "CAPTURED",
      },
    }),
  ]);
}

async function releaseGenerationReservation(requestId: string, reason: string) {
  const request = await prisma.generationRequest.findUnique({
    where: { id: requestId },
    include: {
      user: {
        include: {
          billingAccount: true,
        },
      },
    },
  });

  if (
    !request ||
    request.billingStatus !== "RESERVED" ||
    !request.user.billingAccount ||
    request.priceMinor <= 0
  ) {
    return;
  }

  await prisma.$transaction([
    prisma.billingAccount.update({
      where: { id: request.user.billingAccount.id },
      data: {
        reservedMinor: {
          decrement: request.priceMinor,
        },
      },
    }),
    prisma.billingLedgerEntry.create({
      data: {
        accountId: request.user.billingAccount.id,
        userId: request.userId,
        type: "GENERATION_RELEASE",
        amountMinor: request.priceMinor,
        currency: request.currency,
        generationRequestId: request.id,
        idempotencyKey: `generation-release:${request.id}`,
        description: reason,
      },
    }),
    prisma.generationRequest.update({
      where: { id: request.id },
      data: {
        billingStatus: "RELEASED",
      },
    }),
  ]);
}

async function upsertWorkerHeartbeat(status: "ok" | "starting" | "stopping" | "error", lastError?: string) {
  await prisma.workerHeartbeat.upsert({
    where: { workerId },
    create: {
      workerId,
      service: workerService,
      status,
      startedAt: workerStartedAt,
      heartbeatAt: new Date(),
      lastError: lastError ?? null,
      metadataJson: {
        pid: process.pid,
        host: hostname(),
        imageModel,
      },
    },
    update: {
      service: workerService,
      status,
      heartbeatAt: new Date(),
      lastError: lastError ?? null,
      metadataJson: {
        pid: process.pid,
        host: hostname(),
        imageModel,
      },
    },
  });
}

function startHeartbeat() {
  heartbeatTimer = setInterval(() => {
    void upsertWorkerHeartbeat("ok").catch((error) => {
      console.error("[worker] heartbeat failed", error);
    });
  }, heartbeatIntervalMs);
  heartbeatTimer.unref();
}

async function recoverStaleGenerations() {
  const staleBefore = new Date(Date.now() - generationStaleTimeoutMs);
  const staleRequests = await prisma.generationRequest.findMany({
    where: {
      status: {
        in: ["processing", "finalizing"],
      },
      updatedAt: {
        lt: staleBefore,
      },
    },
    select: {
      id: true,
    },
    take: 100,
  });

  for (const request of staleRequests) {
    await releaseGenerationReservation(request.id, "generation_stalled").catch(() => undefined);
    await prisma.generationRequest.update({
      where: { id: request.id },
      data: {
        status: "failed",
        errorMessage: "generation_stalled",
      },
    }).catch(() => undefined);
  }
}

async function buildReferenceParts(
  shots: Array<{ storageKey: string | null; shotType?: string }>
) {
  const readyShots = shots
    .filter((s): s is { storageKey: string; shotType?: string } => typeof s.storageKey === "string")
    .sort((a, b) => (SHOT_PRIORITY[a.shotType ?? ""] ?? 99) - (SHOT_PRIORITY[b.shotType ?? ""] ?? 99));

  if (!readyShots.length) {
    throw new Error("profile_shots_missing");
  }

  return Promise.all(
    readyShots.slice(0, maxRefImages).map(async (shot) => {
      const imageBuffer = await getObject(shot.storageKey);
      const normalized = await sharp(imageBuffer)
        .rotate()
        .resize(768, 768, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 86,
          mozjpeg: true,
        })
        .toBuffer();

      return {
        inlineData: {
          mimeType: "image/jpeg",
          data: normalized.toString("base64"),
        },
      };
    })
  );
}

const SCENE_ANALYSIS_PROMPT = `Analyze this photo in extreme detail for a photographer's brief. Describe everything needed to recreate this exact scene:
- Lighting: direction, quality, color temperature, shadows, highlights
- Composition: framing, depth, foreground/background
- Person: pose, body position, clothing (fabric, color, style), accessories
- Environment: location, background elements, props, textures
- Mood and atmosphere
Output a single detailed paragraph in English. Describe the scene as if briefing a photographer to shoot an identical premium editorial frame. Do not describe the person's face in detail. Focus on scene, pose, wardrobe, lens feel, lighting logic, camera height, and composition.`;

async function requestGemini(args: { model: string; body: unknown }) {
  const apiKey = ensureGeminiApiKey();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= geminiRetryCount; attempt += 1) {
    try {
      const response = await undiciFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          dispatcher: proxyDispatcher,
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(args.body),
          signal: AbortSignal.timeout(geminiRequestTimeoutMs),
        }
      );

      const rawText = await response.text();
      const parsed = rawText ? tryParseJson(rawText) : null;
      if (!response.ok) {
        const errorMessage =
          parsed &&
          typeof parsed === "object" &&
          "error" in parsed &&
          parsed.error &&
          typeof parsed.error === "object" &&
          "message" in parsed.error &&
          typeof parsed.error.message === "string"
            ? parsed.error.message
            : `gemini_request_failed_${response.status}`;

        if (shouldRetryGemini(response.status, errorMessage) && attempt < geminiRetryCount) {
          await sleep(1200 * (attempt + 1));
          continue;
        }

        throw new Error(errorMessage);
      }

      if (!parsed || typeof parsed !== "object") {
        throw new Error("gemini_invalid_response");
      }

      return parsed;
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error("gemini_request_failed");
      lastError = normalized;

      if (
        attempt < geminiRetryCount &&
        shouldRetryGemini(undefined, normalized.message)
      ) {
        await sleep(1200 * (attempt + 1));
        continue;
      }

      throw normalized;
    }
  }

  throw lastError ?? new Error("gemini_request_failed");
}

async function analyzeSceneFromImage(args: {
  imageBuffer: Buffer;
  model: string;
}): Promise<string> {
  const imageBase64 = args.imageBuffer.toString("base64");
  const parsed = await requestGemini({
    model: args.model,
    body: {
      contents: [
        {
          role: "user",
          parts: [
            { text: SCENE_ANALYSIS_PROMPT },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT"],
      },
    },
  });

  const candidates = parsed && typeof parsed === "object" && "candidates" in parsed
    ? (parsed as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates
    : undefined;
  const text = candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== "string") {
    throw new Error("scene_analysis_no_text");
  }
  return text.trim();
}

function extractGeneratedImage(response: any) {
  for (const candidate of response?.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData?.data) {
        return {
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType ?? "image/png",
        };
      }
    }
  }

  throw new Error(
    typeof response?.text === "string" && response.text ? response.text : "gemini_image_not_returned"
  );
}

async function renderGenerationImage(args: {
  model: string;
  prompt: string;
  shots: Array<{ storageKey: string | null; shotType?: string }>;
}) {
  const referenceParts = await buildReferenceParts(args.shots);
  const parsed = await requestGemini({
    model: args.model,
    body: {
      contents: [
        {
          role: "user",
          parts: [{ text: args.prompt }, ...referenceParts],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    },
  });

  const generated = extractGeneratedImage(parsed);
  const outputBuffer = Buffer.from(generated.data, "base64");
  const normalized = await sharp(outputBuffer).rotate().png().toBuffer();
  const metadata = await sharp(normalized).metadata();

  return {
    image: normalized,
    mimeType: "image/png",
    width: metadata.width ?? 1024,
    height: metadata.height ?? 1024,
  };
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function shouldRetryGemini(status?: number, message?: string | null) {
  const normalized = message?.toLowerCase() ?? "";

  if (typeof status === "number" && [408, 429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  return (
    normalized.includes("timeout") ||
    normalized.includes("deadline") ||
    normalized.includes("resource has been exhausted") ||
    normalized.includes("resource_exhausted") ||
    normalized.includes("temporarily unavailable") ||
    normalized.includes("try again")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runReferenceJob(
  payload: {
    requestId: string;
    userId: string;
    referencePhotoKey: string;
    prompt?: string;
    enhancePortrait?: boolean;
  },
  profile: { id: string; displayName: string; shots: Array<{ storageKey: string | null; shotType: string; status: string }> }
) {
  const refBuffer = await getObject(payload.referencePhotoKey);

  const sceneDescription = await analyzeSceneFromImage({
    imageBuffer: refBuffer,
    model: "gemini-2.5-flash",
  });

  const [promptParts, appConfig] = await Promise.all([
    prisma.promptPart.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.appConfig.findUnique({ where: { id: "default" } }),
  ]);
  const promptConstructor =
    promptParts.length > 0
      ? {
          parts: promptParts.map((p: { key: string; value: string }) => ({ key: p.key, value: p.value })),
          shortPromptMaxChars: appConfig?.shortPromptMaxChars ?? 80,
          shortPromptMaxWords: appConfig?.shortPromptMaxWords ?? 6,
        }
      : undefined;

  const prompt = buildReferenceModePrompt({
    sceneDescription,
    userComment: payload.prompt?.trim(),
    profile: {
      id: profile.id,
      displayName: profile.displayName,
      completionPercent: Math.round((profile.shots.length / 6) * 100),
      shots: profile.shots.map((s: { shotType: string; status: string }) => ({
        id: "",
        type: s.shotType as "front_neutral" | "front_smile" | "left_45" | "right_45" | "left_profile" | "right_profile",
        status: s.status as "missing" | "uploaded" | "approved",
        guidance: "",
        exampleAngle: "",
      })),
    },
    enhancePortrait: payload.enhancePortrait ?? false,
    promptConstructor,
  });

  const generated = await renderGenerationImage({
    model: imageModel,
    prompt,
    shots: profile.shots.map((s: { storageKey: string | null; shotType: string }) => ({
      storageKey: s.storageKey,
      shotType: s.shotType,
    })),
  });

  await prisma.generationRequest.update({
    where: { id: payload.requestId },
    data: { status: "finalizing" },
  });

  const asset = await prisma.generationAsset.create({
    data: {
      requestId: payload.requestId,
      storageKey: generationAssetKey(payload.requestId, randomUUID()),
      mimeType: generated.mimeType,
      width: generated.width,
      height: generated.height,
    },
  });

  await putObject(asset.storageKey, generated.image, asset.mimeType);

  await prisma.generationRequest.update({
    where: { id: payload.requestId },
    data: { status: "completed" },
  });
  await captureGenerationCharge(payload.requestId);
}

async function runJob(payload: {
  requestId: string;
  userId: string;
  mode: "free" | "template" | "reference";
  prompt?: string;
  templateId?: string;
  referencePhotoKey?: string;
  enhancePortrait?: boolean;
}) {
  const request = await prisma.generationRequest.findUnique({
    where: { id: payload.requestId },
    select: {
      status: true,
    },
  });

  if (!request || request.status === "completed" || request.status === "failed") {
    return;
  }

  await prisma.generationRequest.update({
    where: { id: payload.requestId },
    data: { status: "processing", errorMessage: null },
  });

  const profile = await prisma.photoProfile.findFirst({
    where: { userId: payload.userId },
    include: { shots: true },
  });

  if (!profile) {
    throw new Error("profile_not_found");
  }

  const template = payload.templateId
    ? await prisma.promptTemplate.findUnique({ where: { id: payload.templateId } })
    : null;

  if (payload.mode === "reference" && payload.referencePhotoKey) {
    await runReferenceJob(
      {
        requestId: payload.requestId,
        userId: payload.userId,
        referencePhotoKey: payload.referencePhotoKey,
        prompt: payload.prompt,
        enhancePortrait: payload.enhancePortrait,
      },
      profile
    );
    return;
  }

  const [promptParts, appConfig] = await Promise.all([
    prisma.promptPart.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.appConfig.findUnique({ where: { id: "default" } }),
  ]);

  const promptConstructor =
    promptParts.length > 0
      ? {
          parts: promptParts.map((p: { key: string; value: string }) => ({ key: p.key, value: p.value })),
          shortPromptMaxChars: appConfig?.shortPromptMaxChars ?? 80,
          shortPromptMaxWords: appConfig?.shortPromptMaxWords ?? 6,
        }
      : undefined;

  const prepared = provider.preparePayload({
    input: {
      mode: payload.mode,
      prompt: payload.prompt,
      templateId: payload.templateId,
      enhancePortrait: payload.enhancePortrait ?? false,
    },
    profile: {
      id: profile.id,
      displayName: profile.displayName,
      completionPercent: Math.round((profile.shots.length / 6) * 100),
      shots: profile.shots.map((shot: any) => ({
        id: shot.id,
        type: shot.shotType as
          | "front_neutral"
          | "front_smile"
          | "left_45"
          | "right_45"
          | "left_profile"
          | "right_profile",
        status: shot.status as "missing" | "uploaded" | "approved",
        guidance: "",
        exampleAngle: "",
      })),
    },
    template: template
      ? {
          id: template.id,
          slug: template.slug,
          title: template.title,
          subtitle: template.subtitle,
          group: template.group as "vip" | "holiday",
          previewLabel: template.previewLabel,
          description: template.description,
          promptSkeleton: template.promptSkeleton,
          priceMinor: template.priceMinor,
          currency: template.currency as "RUB",
          isActive: template.isActive,
        }
      : undefined,
    config: {
      basePrompt: appConfig?.baseGenerationPrompt ?? DEFAULT_GENERATION_BASE_PROMPT,
    },
    promptConstructor,
  });

  const generated = await renderGenerationImage({
    model: imageModel,
    prompt: prepared.prompt,
    shots: profile.shots.map((shot: { storageKey: string | null; shotType: string }) => ({
      storageKey: shot.storageKey,
      shotType: shot.shotType,
    })),
  });

  await prisma.generationRequest.update({
    where: { id: payload.requestId },
    data: { status: "finalizing" },
  });

  const asset = await prisma.generationAsset.create({
    data: {
      requestId: payload.requestId,
      storageKey: generationAssetKey(payload.requestId, randomUUID()),
      mimeType: generated.mimeType,
      width: generated.width,
      height: generated.height,
    },
  });

  await putObject(asset.storageKey, generated.image, asset.mimeType);

  await prisma.generationRequest.update({
    where: { id: payload.requestId },
    data: { status: "completed" },
  });
  await captureGenerationCharge(payload.requestId);
}

async function main() {
  await prisma.$connect();
  await upsertWorkerHeartbeat("starting");
  await recoverStaleGenerations();
  await ensureBucket();
  await boss.start();
  await boss.createQueue(GENERATION_QUEUE).catch(() => undefined);
  await upsertWorkerHeartbeat("ok");
  startHeartbeat();

  boss.on("error", (error) => {
    console.error("[worker] queue error", error);
    void upsertWorkerHeartbeat(
      "ok",
      error instanceof Error ? error.message : "queue_error"
    ).catch(() => undefined);
  });

  await boss.work(GENERATION_QUEUE, async (jobs) => {
    for (const job of jobs) {
      try {
        await runJob(job.data as Parameters<typeof runJob>[0]);
      } catch (error) {
        const requestId = (job.data as { requestId?: string }).requestId;

        if (requestId) {
          await releaseGenerationReservation(
            requestId,
            error instanceof Error ? error.message : "generation_failed"
          ).catch(() => undefined);
          await prisma.generationRequest.update({
            where: { id: requestId },
            data: {
              status: "failed",
              errorMessage:
                error instanceof Error ? error.message : "generation_failed",
            },
          });
        }

        await upsertWorkerHeartbeat(
          "ok",
          error instanceof Error ? error.message : "generation_failed"
        ).catch(() => undefined);
        throw error;
      }
    }
  });

  console.log("[worker] queue listener started");
}

main().catch(async (error) => {
  console.error("[worker] fatal error", error);
  clearInterval(heartbeatTimer);
  await upsertWorkerHeartbeat(
    "error",
    error instanceof Error ? error.message : "worker_fatal_error"
  ).catch(() => undefined);
  await boss.stop().catch(() => undefined);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    clearInterval(heartbeatTimer);
    await upsertWorkerHeartbeat("stopping").catch(() => undefined);
    await boss.stop().catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  });
}
