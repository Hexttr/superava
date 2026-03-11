import type { FastifyRequest } from "fastify";
import { appConfig } from "../config.js";

type RateLimitEntry = {
  attempts: number;
  firstAttemptAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientIp(request: FastifyRequest): string {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.ip ?? "unknown";
}

function getRateLimitKey(scope: string, request: FastifyRequest, email?: string): string {
  const ip = getClientIp(request);
  const normalizedEmail = email?.trim().toLowerCase() ?? "anonymous";
  return `${scope}:${ip}:${normalizedEmail}`;
}

export function checkAuthRateLimit(
  scope: "login" | "register",
  request: FastifyRequest,
  email?: string
): { ok: true } | { ok: false; retryAfter: number } {
  const key = getRateLimitKey(scope, request, email);
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return { ok: true };
  }

  const windowEndsAt = entry.firstAttemptAt + appConfig.authRateLimitWindowMs;
  if (now >= windowEndsAt) {
    rateLimitStore.delete(key);
    return { ok: true };
  }

  if (entry.attempts >= appConfig.authRateLimitMaxAttempts) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((windowEndsAt - now) / 1000)),
    };
  }

  return { ok: true };
}

export function recordAuthFailure(
  scope: "login" | "register",
  request: FastifyRequest,
  email?: string
): void {
  const key = getRateLimitKey(scope, request, email);
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || now >= current.firstAttemptAt + appConfig.authRateLimitWindowMs) {
    rateLimitStore.set(key, {
      attempts: 1,
      firstAttemptAt: now,
    });
    return;
  }

  current.attempts += 1;
}

export function clearAuthRateLimit(
  scope: "login" | "register",
  request: FastifyRequest,
  email?: string
): void {
  rateLimitStore.delete(getRateLimitKey(scope, request, email));
}
