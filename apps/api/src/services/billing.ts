import {
  billingAccountSchema,
  billingPricingSchema,
  generationQuoteSchema,
  type CreateGenerationInput,
} from "@superava/shared";
import { prisma } from "../db.js";

const DEFAULT_CURRENCY = "RUB" as const;

export async function getOrCreateBillingAccount(userId: string) {
  const existing = await prisma.billingAccount.findUnique({
    where: { userId },
  });

  if (existing) {
    return existing;
  }

  return prisma.billingAccount.create({
    data: {
      userId,
      currency: DEFAULT_CURRENCY,
    },
  });
}

export async function getBillingAccountSummary(userId: string) {
  const account = await getOrCreateBillingAccount(userId);
  return billingAccountSchema.parse({
    balanceMinor: account.balanceMinor,
    reservedMinor: account.reservedMinor,
    availableMinor: account.balanceMinor - account.reservedMinor,
    currency: account.currency,
  });
}

export async function getBillingPricing() {
  const config = await prisma.appConfig.findUnique({
    where: { id: "default" },
  });

  return billingPricingSchema.parse({
    billingEnabled: config?.billingEnabled ?? false,
    textGenerationPriceMinor: config?.textGenerationPriceMinor ?? 0,
    photoGenerationPriceMinor: config?.photoGenerationPriceMinor ?? 0,
    currency: config?.currency ?? DEFAULT_CURRENCY,
  });
}

export async function quoteGeneration(input: CreateGenerationInput) {
  const pricing = await getBillingPricing();

  if (input.mode === "template") {
    if (!input.templateId) {
      throw new Error("template_required");
    }

    const template = await prisma.promptTemplate.findUnique({
      where: { id: input.templateId },
    });

    if (!template || !template.isActive) {
      throw new Error("template_not_found");
    }

    return {
      quote: generationQuoteSchema.parse({
        pricingType: "TEMPLATE",
        amountMinor: template.priceMinor,
        currency: template.currency,
        billingEnabled: pricing.billingEnabled,
        description: `Template: ${template.title}`,
      }),
      template,
      pricingSnapshotJson: {
        pricingType: "TEMPLATE",
        amountMinor: template.priceMinor,
        currency: template.currency,
        templateId: template.id,
        templateTitle: template.title,
        billingEnabled: pricing.billingEnabled,
      },
    };
  }

  if (input.mode === "reference") {
    if (!input.referencePhotoKey) {
      throw new Error("reference_photo_required");
    }

    return {
      quote: generationQuoteSchema.parse({
        pricingType: "REFERENCE",
        amountMinor: pricing.photoGenerationPriceMinor,
        currency: pricing.currency,
        billingEnabled: pricing.billingEnabled,
        description: "Reference photo generation",
      }),
      template: null,
      pricingSnapshotJson: {
        pricingType: "REFERENCE",
        amountMinor: pricing.photoGenerationPriceMinor,
        currency: pricing.currency,
        billingEnabled: pricing.billingEnabled,
      },
    };
  }

  return {
    quote: generationQuoteSchema.parse({
      pricingType: "TEXT",
      amountMinor: pricing.textGenerationPriceMinor,
      currency: pricing.currency,
      billingEnabled: pricing.billingEnabled,
      description: "Text generation",
    }),
    template: null,
    pricingSnapshotJson: {
      pricingType: "TEXT",
      amountMinor: pricing.textGenerationPriceMinor,
      currency: pricing.currency,
      billingEnabled: pricing.billingEnabled,
    },
  };
}

export async function releaseGenerationReservation(args: {
  requestId: string;
  reason: string;
}) {
  const request = await prisma.generationRequest.findUnique({
    where: { id: args.requestId },
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
        description: args.reason,
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

export async function captureGenerationCharge(requestId: string) {
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
