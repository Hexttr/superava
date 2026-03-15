import { authUserSchema, billingAccountSchema, billingPricingSchema } from "@superava/shared";
import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { getBillingAccountSummary, getBillingPricing } from "../services/billing.js";
import { deleteUserSession, createUserSession, SESSION_COOKIE } from "../auth/session.js";
import { registerAndCreateSession, loginAndCreateSession, resetUserPassword } from "../auth/user-auth.js";
import { checkAuthRateLimit, clearAuthRateLimit, recordAuthFailure } from "../auth/rate-limit.js";
import { createEmailVerificationToken, createPasswordResetToken, consumePasswordResetToken, verifyEmailToken } from "../auth/token-service.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../auth/email.js";
import { registerSocialAuthRoutes } from "../auth/social-routes.js";
import { requireUser } from "../http/guards.js";
import { sessionCookieOptions } from "../http/session-cookie.js";
import { getUserFromSession } from "../auth/session.js";

export async function registerAuthRoutes(app: FastifyInstance) {
  await registerSocialAuthRoutes(app, sessionCookieOptions);

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
}
