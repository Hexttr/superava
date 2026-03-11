import {
  normalizeGeminiErrorMessage,
  type CreateGenerationInput,
  type GenerationRecord,
} from "@superava/shared";
import { prisma } from "../db.js";
import { boss, JOB_NAMES } from "../queue.js";
import { quoteGeneration, releaseGenerationReservation } from "./billing.js";
import { getOrCreateProfile } from "./profile.js";

export async function createGeneration(
  userId: string,
  input: CreateGenerationInput
): Promise<{
  jobId: string;
  requestId: string;
  amountMinor: number;
  currency: "RUB";
  billingStatus: "NONE" | "RESERVED" | "CAPTURED" | "RELEASED" | "REFUNDED";
}> {
  await getOrCreateProfile(userId);

  const { quote, pricingSnapshotJson } = await quoteGeneration(input);

  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.generationRequest.create({
      data: {
        userId,
        mode: input.mode,
        prompt: input.prompt ?? null,
        templateId: input.templateId ?? null,
        referencePhotoKey: input.referencePhotoKey ?? null,
        status: "queued",
        billingStatus:
          quote.billingEnabled && quote.amountMinor > 0 ? "RESERVED" : "NONE",
        pricingType: quote.pricingType,
        priceMinor: quote.amountMinor,
        currency: quote.currency,
        pricingSnapshotJson,
      },
    });

    if (quote.billingEnabled && quote.amountMinor > 0) {
      const account = await tx.billingAccount.upsert({
        where: { userId },
        create: {
          userId,
          currency: quote.currency,
        },
        update: {},
      });

      const availableMinor = account.balanceMinor - account.reservedMinor;
      if (availableMinor < quote.amountMinor) {
        throw new Error("insufficient_balance");
      }

      await tx.billingAccount.update({
        where: { id: account.id },
        data: {
          reservedMinor: {
            increment: quote.amountMinor,
          },
        },
      });

      await tx.billingLedgerEntry.create({
        data: {
          accountId: account.id,
          userId,
          type: "GENERATION_RESERVE",
          amountMinor: quote.amountMinor,
          currency: quote.currency,
          generationRequestId: created.id,
          idempotencyKey: `generation-reserve:${created.id}`,
          description: quote.description,
          metadataJson: pricingSnapshotJson,
        },
      });
    }

    return created;
  });

  try {
    const jobId = await boss.send(JOB_NAMES.GENERATION, {
      requestId: request.id,
      userId,
      mode: input.mode,
      prompt: input.prompt,
      templateId: input.templateId,
      referencePhotoKey: input.referencePhotoKey,
      enhancePortrait: input.enhancePortrait ?? false,
    });

    if (!jobId) {
      throw new Error("job_enqueue_failed");
    }

    await prisma.generationRequest.update({
      where: { id: request.id },
      data: { jobId },
    });

    return {
      jobId,
      requestId: request.id,
      amountMinor: request.priceMinor,
      currency: request.currency,
      billingStatus: request.billingStatus,
    };
  } catch (error) {
    await releaseGenerationReservation({
      requestId: request.id,
      reason: "Job enqueue failed",
    });
    await prisma.generationRequest.update({
      where: { id: request.id },
      data: {
        status: "failed",
        errorMessage:
          error instanceof Error ? error.message : "job_enqueue_failed",
      },
    });
    throw error;
  }
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
    mode: r.mode as "free" | "template" | "reference",
    status: r.status as GenerationRecord["status"],
    billingStatus: r.billingStatus as GenerationRecord["billingStatus"],
    priceMinor: r.priceMinor,
    currency: r.currency as GenerationRecord["currency"],
    title:
      r.prompt ??
      (r.mode === "reference"
        ? "По фото"
        : r.templateId
          ? templatesById.get(r.templateId)?.title ?? "Шаблон"
          : "Свободный запрос"),
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
