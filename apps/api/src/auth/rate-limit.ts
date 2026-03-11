import type { FastifyRequest } from "fastify";
import { appConfig } from "../config.js";
import { prisma } from "../db.js";

function getClientIp(request: FastifyRequest): string {
  return request.ip ?? "unknown";
}

function getRateLimitKey(scope: string, request: FastifyRequest, email?: string): string {
  const ip = getClientIp(request);
  const normalizedEmail = email?.trim().toLowerCase() ?? "anonymous";
  return `${scope}:${ip}:${normalizedEmail}`;
}

export async function checkAuthRateLimit(
  scope: "login" | "register",
  request: FastifyRequest,
  email?: string
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const key = getRateLimitKey(scope, request, email);
  const now = new Date();
  const entry = await prisma.authRateLimit.findUnique({
    where: { key },
  });

  if (!entry) {
    return { ok: true };
  }

  if (now >= entry.expiresAt) {
    await prisma.authRateLimit.delete({
      where: { key },
    }).catch(() => undefined);
    return { ok: true };
  }

  if (entry.attempts >= appConfig.authRateLimitMaxAttempts) {
    return {
      ok: false,
      retryAfter: Math.max(
        1,
        Math.ceil((entry.expiresAt.getTime() - now.getTime()) / 1000)
      ),
    };
  }

  return { ok: true };
}

export async function recordAuthFailure(
  scope: "login" | "register",
  request: FastifyRequest,
  email?: string
): Promise<void> {
  const key = getRateLimitKey(scope, request, email);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + appConfig.authRateLimitWindowMs);
  const current = await prisma.authRateLimit.findUnique({
    where: { key },
  });

  if (!current || now >= current.expiresAt) {
    await prisma.authRateLimit.upsert({
      where: { key },
      create: {
        key,
        scope,
        attempts: 1,
        firstAttemptAt: now,
        expiresAt,
      },
      update: {
        scope,
        attempts: 1,
        firstAttemptAt: now,
        expiresAt,
      },
    });
    return;
  }

  await prisma.authRateLimit.update({
    where: { key },
    data: {
      attempts: {
        increment: 1,
      },
    },
  });
}

export async function clearAuthRateLimit(
  scope: "login" | "register",
  request: FastifyRequest,
  email?: string
): Promise<void> {
  await prisma.authRateLimit.delete({
    where: { key: getRateLimitKey(scope, request, email) },
  }).catch(() => undefined);
}
