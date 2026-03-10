import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env", "../../.env"] });
// Watcher reload marker for local env changes.

import { DEFAULT_GENERATION_BASE_PROMPT, GeminiProviderAdapter } from "@superava/ai-provider";
import { randomUUID } from "node:crypto";
import PgBoss from "pg-boss";
import sharp from "sharp";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { prisma } from "./db.js";
import { ensureBucket, generationAssetKey, getObject, putObject } from "./storage.js";

const provider = new GeminiProviderAdapter();
const connectionString = process.env.DATABASE_URL;
const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
const proxyUrl =
  process.env.HTTPS_PROXY ??
  process.env.HTTP_PROXY ??
  process.env.ALL_PROXY ??
  undefined;
const proxyDispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const boss = new PgBoss({
  connectionString,
  schema: "pgboss",
});
const GENERATION_QUEUE = "generation";

function ensureGeminiApiKey() {
  if (!geminiApiKey) {
    throw new Error("gemini_api_key_missing");
  }

  return geminiApiKey;
}

async function buildReferenceParts(
  shots: Array<{ storageKey: string | null }>
) {
  const readyShots = shots.filter(
    (shot): shot is { storageKey: string } => typeof shot.storageKey === "string"
  );

  if (!readyShots.length) {
    throw new Error("profile_shots_missing");
  }

  return Promise.all(
    readyShots.slice(0, 6).map(async (shot) => {
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
  shots: Array<{ storageKey: string | null }>;
}) {
  const apiKey = ensureGeminiApiKey();
  const referenceParts = await buildReferenceParts(args.shots);
  const response = await undiciFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      dispatcher: proxyDispatcher,
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: args.prompt }, ...referenceParts],
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
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

    throw new Error(errorMessage);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("gemini_invalid_response");
  }

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

async function runJob(payload: {
  requestId: string;
  userId: string;
  mode: "free" | "template";
  prompt?: string;
  templateId?: string;
}) {
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
  const appConfig = await prisma.appConfig.findUnique({
    where: { id: "default" },
  });

  const prepared = provider.preparePayload({
    input: {
      mode: payload.mode,
      prompt: payload.prompt,
      templateId: payload.templateId,
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
        }
      : undefined,
    config: {
      basePrompt: appConfig?.baseGenerationPrompt ?? DEFAULT_GENERATION_BASE_PROMPT,
    },
  });

  const generated = await renderGenerationImage({
    model: prepared.model,
    prompt: prepared.prompt,
    shots: profile.shots.map((shot: { storageKey: string | null }) => ({
      storageKey: shot.storageKey,
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
}

async function main() {
  await prisma.$connect();
  await ensureBucket();
  await boss.start();
  await boss.createQueue(GENERATION_QUEUE).catch(() => undefined);

  boss.on("error", (error) => {
    console.error("[worker] queue error", error);
  });

  await boss.work(GENERATION_QUEUE, async (jobs) => {
    for (const job of jobs) {
      try {
        await runJob(job.data as Parameters<typeof runJob>[0]);
      } catch (error) {
        const requestId = (job.data as { requestId?: string }).requestId;

        if (requestId) {
          await prisma.generationRequest.update({
            where: { id: requestId },
            data: {
              status: "failed",
              errorMessage:
                error instanceof Error ? error.message : "generation_failed",
            },
          });
        }

        throw error;
      }
    }
  });

  console.log("[worker] queue listener started");
}

main().catch(async (error) => {
  console.error("[worker] fatal error", error);
  await boss.stop().catch(() => undefined);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await boss.stop().catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  });
}
