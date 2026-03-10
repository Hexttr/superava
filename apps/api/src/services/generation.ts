import {
  normalizeGeminiErrorMessage,
  type CreateGenerationInput,
  type GenerationRecord,
} from "@superava/shared";
import { prisma } from "../db.js";
import { boss, JOB_NAMES } from "../queue.js";
import { getOrCreateProfile } from "./profile.js";

export async function createGeneration(
  userId: string,
  input: CreateGenerationInput
): Promise<{ jobId: string; requestId: string }> {
  await getOrCreateProfile(userId);

  if (input.mode === "template" && input.templateId) {
    const template = await prisma.promptTemplate.findUnique({
      where: { id: input.templateId },
    });

    if (!template) {
      throw new Error("template_not_found");
    }
  }

  const request = await prisma.generationRequest.create({
    data: {
      userId,
      mode: input.mode,
      prompt: input.prompt ?? null,
      templateId: input.templateId ?? null,
      status: "queued",
    },
  });

  const jobId = await boss.send(JOB_NAMES.GENERATION, {
    requestId: request.id,
    userId,
    mode: input.mode,
    prompt: input.prompt,
    templateId: input.templateId,
  });

  if (!jobId) {
    throw new Error("job_enqueue_failed");
  }

  await prisma.generationRequest.update({
    where: { id: request.id },
    data: { jobId },
  });

  return { jobId, requestId: request.id };
}

export async function listGenerations(userId: string): Promise<GenerationRecord[]> {
  const requests = await prisma.generationRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { assets: true },
  });

  const templateIds = Array.from(
    new Set(
      requests
        .map((request) => request.templateId)
        .filter((templateId): templateId is string => Boolean(templateId))
    )
  );
  const templates = templateIds.length
    ? await prisma.promptTemplate.findMany({
        where: {
          id: {
            in: templateIds,
          },
        },
      })
    : [];
  const templatesById = new Map(templates.map((template) => [template.id, template]));

  return requests.map((r) => ({
    id: r.id,
    mode: r.mode as "free" | "template",
    status: r.status as GenerationRecord["status"],
    title:
      r.prompt ??
      (r.templateId ? templatesById.get(r.templateId)?.title ?? "Шаблон" : "Свободный запрос"),
    subtitle: statusSubtitle(r.status, r.errorMessage),
    createdAt: r.createdAt.toISOString(),
    previewUrl: r.assets[0] ? `/api/v1/generations/${r.id}/preview` : undefined,
  }));
}

function statusSubtitle(status: string, errorMessage?: string | null): string {
  switch (status) {
    case "queued":
      return "Готовим кадры";
    case "processing":
      return "Генерируем";
    case "finalizing":
      return "Собираем результат";
    case "completed":
      return "Готово";
    case "failed":
      return normalizeGeminiErrorMessage(errorMessage);
    default:
      return status;
  }
}
