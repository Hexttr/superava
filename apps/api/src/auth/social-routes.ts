import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { appConfig } from "../config.js";
import {
  clearSocialAuthChallengeCookie,
  finishOAuthCallback,
  finishTelegramVerification,
  getSocialAuthChallenge,
  listLinkedAuthProviders,
  parseSocialProvider,
  prepareSocialAuthStart,
  setSocialAuthChallengeCookie,
  unlinkSocialProvider,
} from "./social.js";
import { getUserFromSession, SESSION_COOKIE } from "./session.js";

type SessionCookieOptions = {
  path: string;
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  maxAge: number;
};

function replyWithAuthError(reply: FastifyReply, statusCode: number, error: string) {
  return reply.status(statusCode).send({ error });
}

export async function registerSocialAuthRoutes(
  app: FastifyInstance,
  sessionCookieOptions: SessionCookieOptions
) {
  app.get("/api/v1/auth/:provider/start", async (request, reply) => {
    const provider = parseSocialProvider(
      (request.params as { provider?: string }).provider
    );
    if (!provider) {
      return replyWithAuthError(reply, 404, "provider_not_supported");
    }

    const start = prepareSocialAuthStart(provider, "login");
    if (!start.ok) {
      return reply.redirect(
        `${appConfig.webOrigin.replace(/\/$/, "")}/login?error=${encodeURIComponent(start.error)}&provider=${encodeURIComponent(
          provider.toLowerCase()
        )}`
      );
    }

    setSocialAuthChallengeCookie(reply, start.challenge);
    return reply.redirect(start.redirectUrl);
  });

  app.get("/api/v1/auth/:provider/callback", async (request, reply) => {
    const provider = parseSocialProvider(
      (request.params as { provider?: string }).provider
    );
    if (!provider) {
      return replyWithAuthError(reply, 404, "provider_not_supported");
    }

    const currentUser = await getUserFromSession(request);
    const query = request.query as {
      code?: string;
      state?: string;
      error?: string;
      device_id?: string;
    };
    const result = await finishOAuthCallback({
      provider,
      query,
      currentUserId: currentUser?.id,
      challenge: getSocialAuthChallenge(request),
    });

    clearSocialAuthChallengeCookie(reply);
    if (result.ok && result.token) {
      reply.setCookie(SESSION_COOKIE, result.token, sessionCookieOptions);
    }
    return reply.redirect(result.redirectTo);
  });

  app.post("/api/v1/auth/telegram/verify", async (request, reply) => {
    const currentUser = await getUserFromSession(request);
    const payload = (request.body as Record<string, unknown>) ?? {};
    const result = await finishTelegramVerification({
      payload,
      currentUserId: currentUser?.id,
      challenge: getSocialAuthChallenge(request),
    });

    clearSocialAuthChallengeCookie(reply);
    if (!result.ok) {
      return replyWithAuthError(reply, result.statusCode, result.error);
    }

    if (result.token) {
      reply.setCookie(SESSION_COOKIE, result.token, sessionCookieOptions);
    }

    return reply.send({
      ok: true,
      redirectTo: result.redirectTo,
    });
  });

  app.post("/api/v1/auth/providers/:provider/link/start", async (request, reply) => {
    const currentUser = await getUserFromSession(request);
    if (!currentUser) {
      return replyWithAuthError(reply, 401, "unauthorized");
    }

    const provider = parseSocialProvider(
      (request.params as { provider?: string }).provider
    );
    if (!provider) {
      return replyWithAuthError(reply, 404, "provider_not_supported");
    }

    const start = prepareSocialAuthStart(provider, "link");
    if (!start.ok) {
      return replyWithAuthError(reply, 400, start.error);
    }

    setSocialAuthChallengeCookie(reply, start.challenge);
    return reply.send({
      ok: true,
      url: start.redirectUrl,
    });
  });

  app.get("/api/v1/auth/providers/me", async (request, reply) => {
    const currentUser = await getUserFromSession(request);
    if (!currentUser) {
      return replyWithAuthError(reply, 401, "unauthorized");
    }

    return reply.send({
      items: await listLinkedAuthProviders(currentUser.id),
    });
  });

  app.delete("/api/v1/auth/providers/:provider", async (request, reply) => {
    const currentUser = await getUserFromSession(request);
    if (!currentUser) {
      return replyWithAuthError(reply, 401, "unauthorized");
    }

    const provider = parseSocialProvider(
      (request.params as { provider?: string }).provider
    );
    if (!provider) {
      return replyWithAuthError(reply, 404, "provider_not_supported");
    }

    const result = await unlinkSocialProvider(currentUser.id, provider);
    if (!result.ok) {
      return replyWithAuthError(reply, result.statusCode, result.error);
    }

    return reply.send({ ok: true });
  });
}
