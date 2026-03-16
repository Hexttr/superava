import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  Prisma,
  PrismaClient as GeneratedPrismaClient,
} from "../generated/prisma/index.js";
import { prisma } from "../db.js";
import { appConfig } from "../config.js";
import { createUserSession } from "./session.js";

export const SOCIAL_AUTH_CHALLENGE_COOKIE = "social_auth_challenge";
const SOCIAL_AUTH_CHALLENGE_TTL_SECONDS = 10 * 60;

export const socialProviderOrder = ["YANDEX", "VK", "TELEGRAM", "MAILRU", "OK"] as const;
export type SocialProvider = (typeof socialProviderOrder)[number];
export type SocialAuthMode = "login" | "link";

type SocialChallenge = {
  provider: SocialProvider;
  mode: SocialAuthMode;
  state: string;
  codeVerifier?: string;
  createdAt: number;
};

type NormalizedSocialProfile = {
  provider: SocialProvider;
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  rawProfileJson: unknown;
};

type OAuthProviderConfig = {
  provider: Exclude<SocialProvider, "TELEGRAM">;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  pkce: boolean;
  authorizeProvider?: "vkid" | "mail_ru" | "ok_ru";
};

type ProviderStatus = {
  provider: SocialProvider;
  connected: boolean;
  configured: boolean;
  providerEmail?: string | null;
  providerEmailVerified: boolean;
  displayName?: string | null;
  avatarUrl?: string | null;
  linkedAt?: string | null;
};

type DbClient = Omit<
  GeneratedPrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

const db = prisma as unknown as GeneratedPrismaClient;

function toJsonValue(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function slugToProvider(slug?: string): SocialProvider | null {
  switch (slug?.trim().toLowerCase()) {
    case "yandex":
      return "YANDEX";
    case "vk":
      return "VK";
    case "telegram":
      return "TELEGRAM";
    case "mailru":
      return "MAILRU";
    case "ok":
      return "OK";
    default:
      return null;
  }
}

export function providerToSlug(provider: SocialProvider): string {
  return provider.toLowerCase();
}

function providerLabel(provider: SocialProvider) {
  switch (provider) {
    case "YANDEX":
      return "Yandex";
    case "VK":
      return "VK";
    case "TELEGRAM":
      return "Telegram";
    case "MAILRU":
      return "Mail.ru";
    case "OK":
      return "Одноклассники";
  }
}

function encodeBase64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function sha256Base64Url(input: string) {
  return createHash("sha256").update(input).digest("base64url");
}

function buildSignedChallengeValue(challenge: SocialChallenge) {
  const payload = encodeBase64Url(JSON.stringify(challenge));
  const signature = createHmac("sha256", appConfig.sessionSecret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

function parseSignedChallengeValue(value?: string): SocialChallenge | null {
  if (!value) return null;
  const [payload, signature] = value.split(".", 2);
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", appConfig.sessionSecret)
    .update(payload)
    .digest("base64url");

  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SocialChallenge;
    if (!parsed.provider || !socialProviderOrder.includes(parsed.provider)) {
      return null;
    }
    if (!parsed.mode || (parsed.mode !== "login" && parsed.mode !== "link")) {
      return null;
    }
    if (!parsed.state || typeof parsed.createdAt !== "number") {
      return null;
    }
    const isExpired =
      Date.now() - parsed.createdAt > SOCIAL_AUTH_CHALLENGE_TTL_SECONDS * 1000;
    return isExpired ? null : parsed;
  } catch {
    return null;
  }
}

function challengeCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: appConfig.isProduction,
    maxAge: SOCIAL_AUTH_CHALLENGE_TTL_SECONDS,
  };
}

export function setSocialAuthChallengeCookie(
  reply: FastifyReply,
  challenge: SocialChallenge
) {
  reply.setCookie(
    SOCIAL_AUTH_CHALLENGE_COOKIE,
    buildSignedChallengeValue(challenge),
    challengeCookieOptions()
  );
}

export function clearSocialAuthChallengeCookie(reply: FastifyReply) {
  reply.clearCookie(SOCIAL_AUTH_CHALLENGE_COOKIE, { path: "/" });
}

export function getSocialAuthChallenge(request: FastifyRequest) {
  const cookies = request.cookies as Record<string, string> | undefined;
  return parseSignedChallengeValue(cookies?.[SOCIAL_AUTH_CHALLENGE_COOKIE]);
}

function getOAuthProviderConfig(
  provider: Exclude<SocialProvider, "TELEGRAM">
): OAuthProviderConfig | null {
  switch (provider) {
    case "YANDEX":
      if (!appConfig.yandexClientId || !appConfig.yandexClientSecret) {
        return null;
      }
      return {
        provider,
        authorizeUrl: "https://oauth.yandex.ru/authorize",
        tokenUrl: "https://oauth.yandex.ru/token",
        userInfoUrl: "https://login.yandex.ru/info",
        clientId: appConfig.yandexClientId,
        clientSecret: appConfig.yandexClientSecret,
        scope: appConfig.yandexScope,
        pkce: false,
      };
    case "VK":
      if (!appConfig.vkClientId || !appConfig.vkClientSecret) {
        return null;
      }
      return {
        provider,
        authorizeUrl: "https://id.vk.ru/authorize",
        tokenUrl: "https://id.vk.ru/oauth2/auth",
        userInfoUrl: "https://id.vk.ru/oauth2/user_info",
        clientId: appConfig.vkClientId,
        clientSecret: appConfig.vkClientSecret,
        scope: appConfig.vkScope,
        pkce: true,
        authorizeProvider: "vkid",
      };
    case "MAILRU":
      if (!appConfig.vkClientId || !appConfig.vkClientSecret) {
        return null;
      }
      return {
        provider,
        authorizeUrl: "https://id.vk.ru/authorize",
        tokenUrl: "https://id.vk.ru/oauth2/auth",
        userInfoUrl: "https://id.vk.ru/oauth2/user_info",
        clientId: appConfig.vkClientId,
        clientSecret: appConfig.vkClientSecret,
        scope: appConfig.vkScope,
        pkce: true,
        authorizeProvider: "mail_ru",
      };
    case "OK":
      if (!appConfig.vkClientId || !appConfig.vkClientSecret) {
        return null;
      }
      return {
        provider,
        authorizeUrl: "https://id.vk.ru/authorize",
        tokenUrl: "https://id.vk.ru/oauth2/auth",
        userInfoUrl: "https://id.vk.ru/oauth2/user_info",
        clientId: appConfig.vkClientId,
        clientSecret: appConfig.vkClientSecret,
        scope: appConfig.vkScope,
        pkce: true,
        authorizeProvider: "ok_ru",
      };
  }
}

export function isSocialProviderConfigured(provider: SocialProvider) {
  if (provider === "TELEGRAM") {
    return Boolean(appConfig.telegramBotToken && appConfig.telegramBotName);
  }
  return Boolean(getOAuthProviderConfig(provider));
}

function getOAuthCallbackUrl(provider: Exclude<SocialProvider, "TELEGRAM">) {
  return `${appConfig.authPublicUrl.replace(/\/$/, "")}/api/v1/auth/${providerToSlug(provider)}/callback`;
}

function buildFrontendLoginRedirect(
  error: string,
  provider?: SocialProvider,
  email?: string
) {
  const url = new URL(`${appConfig.webOrigin.replace(/\/$/, "")}/login`);
  url.searchParams.set("error", error);
  if (provider) {
    url.searchParams.set("provider", providerToSlug(provider));
  }
  if (email) {
    url.searchParams.set("email", email);
  }
  return url.toString();
}

function buildHomeRedirect(params: Record<string, string>) {
  const url = new URL(`${appConfig.webOrigin.replace(/\/$/, "")}/`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function buildProfileRedirect(params: Record<string, string>) {
  const url = new URL(`${appConfig.webOrigin.replace(/\/$/, "")}/`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.hash = "profile";
  return url.toString();
}

function buildTelegramStartUrl() {
  return `${appConfig.webOrigin.replace(/\/$/, "")}/auth/telegram`;
}

export function prepareSocialAuthStart(
  provider: SocialProvider,
  mode: SocialAuthMode
): { ok: true; redirectUrl: string; challenge: SocialChallenge } | { ok: false; error: string } {
  if (!isSocialProviderConfigured(provider)) {
    return { ok: false, error: "social_provider_not_configured" };
  }

  const state = randomBytes(24).toString("hex");
  const challenge: SocialChallenge = {
    provider,
    mode,
    state,
    createdAt: Date.now(),
  };

  if (provider === "TELEGRAM") {
    return {
      ok: true,
      redirectUrl: buildTelegramStartUrl(),
      challenge,
    };
  }

  const config = getOAuthProviderConfig(provider);
  if (!config) {
    return { ok: false, error: "social_provider_not_configured" };
  }

  const authorizeUrl = new URL(config.authorizeUrl);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("redirect_uri", getOAuthCallbackUrl(provider));
  authorizeUrl.searchParams.set("state", state);
  if (config.scope) {
    authorizeUrl.searchParams.set("scope", config.scope);
  }
  if (config.authorizeProvider) {
    authorizeUrl.searchParams.set("provider", config.authorizeProvider);
  }

  if (config.pkce) {
    const codeVerifier = encodeBase64Url(randomBytes(48));
    challenge.codeVerifier = codeVerifier;
    authorizeUrl.searchParams.set("code_challenge", sha256Base64Url(codeVerifier));
    authorizeUrl.searchParams.set("code_challenge_method", "S256");
  }

  return {
    ok: true,
    redirectUrl: authorizeUrl.toString(),
    challenge,
  };
}

async function fetchOAuthToken(
  provider: Exclude<SocialProvider, "TELEGRAM">,
  code: string,
  codeVerifier?: string,
  deviceId?: string,
  state?: string
) {
  const config = getOAuthProviderConfig(provider);
  if (!config) {
    throw new Error("social_provider_not_configured");
  }

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("client_id", config.clientId);
  body.set("client_secret", config.clientSecret);
  body.set("redirect_uri", getOAuthCallbackUrl(provider));
  if (config.pkce && codeVerifier) {
    body.set("code_verifier", codeVerifier);
  }
  if (provider === "VK" && deviceId) {
    body.set("device_id", deviceId);
  }
  if (provider === "VK" && state) {
    body.set("state", state);
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`social_token_exchange_failed:${response.status}:${text}`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  const payload =
    typeof json.response === "object" && json.response !== null
      ? (json.response as Record<string, unknown>)
      : json;
  const accessToken =
    typeof payload.access_token === "string"
      ? payload.access_token
      : typeof payload.accessToken === "string"
        ? payload.accessToken
        : "";

  if (!accessToken) {
    throw new Error("social_token_missing");
  }

  const userId =
    typeof payload.user_id === "string" || typeof payload.user_id === "number"
      ? String(payload.user_id)
      : typeof payload.userId === "string" || typeof payload.userId === "number"
        ? String(payload.userId)
        : null;

  return {
    accessToken,
    userId,
  };
}

async function fetchProviderProfile(
  provider: Exclude<SocialProvider, "TELEGRAM">,
  accessToken: string,
  fallbackProviderUserId?: string | null
): Promise<NormalizedSocialProfile> {
  const config = getOAuthProviderConfig(provider);
  if (!config) {
    throw new Error("social_provider_not_configured");
  }

  const requestUrl =
    provider === "YANDEX"
      ? `${config.userInfoUrl}?format=json`
      : config.userInfoUrl;

  let response: Response;
  if (provider === "VK") {
    const body = new URLSearchParams();
    body.set("access_token", accessToken);
    body.set("client_id", config.clientId);
    response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body,
    });
  } else {
    response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Authorization: provider === "YANDEX" ? `OAuth ${accessToken}` : `Bearer ${accessToken}`,
        accept: "application/json",
      },
    });
  }

  if (!response.ok && provider === "VK") {
    response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        accept: "application/json",
      },
    });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`social_profile_fetch_failed:${response.status}:${text}`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  if (typeof json.error === "string") {
    const description =
      typeof json.error_description === "string" ? json.error_description : "";
    throw new Error(
      `social_profile_fetch_failed:${json.error}${description ? `:${description}` : ""}`
    );
  }
  return normalizeProviderProfile(provider, json, fallbackProviderUserId);
}

function firstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

function normalizeProviderProfile(
  provider: Exclude<SocialProvider, "TELEGRAM">,
  raw: Record<string, unknown>,
  fallbackProviderUserId?: string | null
): NormalizedSocialProfile {
  const root =
    typeof raw.user === "object" && raw.user !== null
      ? (raw.user as Record<string, unknown>)
      : typeof raw.response === "object" && raw.response !== null
        ? (raw.response as Record<string, unknown>)
        : raw;

  const email = firstNonEmptyString(
    root.email,
    root.default_email,
    Array.isArray(root.emails) ? root.emails[0] : null,
    raw.email
  );
  const avatarId = firstNonEmptyString(root.default_avatar_id);
  const avatarUrl =
    firstNonEmptyString(
      root.avatar,
      root.avatar_url,
      root.picture,
      root.photo_200,
      root.photo,
      raw.avatar_url
    ) ??
    (provider === "YANDEX" && avatarId
      ? `https://avatars.yandex.net/get-yapic/${avatarId}/islands-200`
      : null);

  const displayName =
    firstNonEmptyString(
      root.display_name,
      root.real_name,
      root.name,
      [root.first_name, root.last_name]
        .filter((part) => typeof part === "string" && part.trim())
        .join(" ")
        .trim(),
      root.login,
      root.username,
      root.nickname
    ) ?? email;

  const providerUserId = firstNonEmptyString(
    root.id,
    root.sub,
    root.user_id,
    root.uid,
    raw.id,
    raw.sub,
    raw.x_mailru_vid,
    fallbackProviderUserId
  );

  if (!providerUserId) {
    throw new Error("social_profile_missing_id");
  }

  return {
    provider,
    providerUserId,
    email: email?.toLowerCase() ?? null,
    emailVerified: Boolean(
      root.email_verified ??
        root.is_email_verified ??
        root.verified_email ??
        raw.email_verified ??
        false
    ),
    displayName,
    avatarUrl,
    rawProfileJson: raw,
  };
}

function normalizeTelegramPayload(payload: Record<string, unknown>) {
  const id = firstNonEmptyString(payload.id);
  if (!id) {
    throw new Error("telegram_profile_missing_id");
  }

  const name = [payload.first_name, payload.last_name]
    .filter((part) => typeof part === "string" && part.trim())
    .join(" ")
    .trim();

  return {
    provider: "TELEGRAM" as const,
    providerUserId: id,
    email: null,
    emailVerified: false,
    displayName: name || firstNonEmptyString(payload.username) || "Telegram user",
    avatarUrl: firstNonEmptyString(payload.photo_url),
    rawProfileJson: payload,
  };
}

function verifyTelegramSignature(payload: Record<string, unknown>) {
  const hash = firstNonEmptyString(payload.hash);
  const authDate = firstNonEmptyString(payload.auth_date);

  if (!hash || !authDate || !appConfig.telegramBotToken) {
    return false;
  }

  const authDateNumber = Number(authDate);
  if (!Number.isFinite(authDateNumber)) {
    return false;
  }

  const isExpired = Date.now() / 1000 - authDateNumber > SOCIAL_AUTH_CHALLENGE_TTL_SECONDS;
  if (isExpired) {
    return false;
  }

  const lines = Object.entries(payload)
    .filter(([key, value]) => key !== "hash" && value !== undefined && value !== null && String(value) !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value)}`);

  const dataCheckString = lines.join("\n");
  const secret = createHash("sha256").update(appConfig.telegramBotToken).digest();
  const expected = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  return timingSafeEqual(Buffer.from(hash), Buffer.from(expected));
}

async function loginOrCreateSocialUser(profile: NormalizedSocialProfile) {
  return db.$transaction(async (tx: DbClient) => {
    const existingIdentity = await tx.authIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
        },
      },
      include: {
        user: true,
      },
    });

    if (existingIdentity) {
      if (existingIdentity.user.status === "BLOCKED") {
        return { ok: false as const, error: "account_blocked" };
      }

      await tx.authIdentity.update({
        where: { id: existingIdentity.id },
        data: {
          providerEmail: profile.email,
          providerEmailVerified: profile.emailVerified,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          rawProfileJson: toJsonValue(profile.rawProfileJson),
        },
      });

      await tx.user.update({
        where: { id: existingIdentity.user.id },
        data: {
          name: existingIdentity.user.name ?? profile.displayName,
          avatarUrl: existingIdentity.user.avatarUrl ?? profile.avatarUrl,
          emailVerified: existingIdentity.user.emailVerified || profile.emailVerified,
        },
      });

      return {
        ok: true as const,
        userId: existingIdentity.user.id,
        isNewUser: false,
      };
    }

    if (profile.email) {
      const existingEmailUser = await tx.user.findUnique({
        where: { email: profile.email },
      });
      if (existingEmailUser) {
        return {
          ok: false as const,
          error: "social_email_conflict",
          email: profile.email,
        };
      }
    }

    const user = await tx.user.create({
      data: {
        email: profile.email,
        name: profile.displayName,
        avatarUrl: profile.avatarUrl,
        emailVerified: profile.emailVerified,
        status: "ACTIVE",
      },
    });

    await tx.authIdentity.create({
      data: {
        userId: user.id,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        providerEmail: profile.email,
        providerEmailVerified: profile.emailVerified,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        rawProfileJson: toJsonValue(profile.rawProfileJson),
      },
    });

    return {
      ok: true as const,
      userId: user.id,
      isNewUser: true,
    };
  });
}

async function linkSocialIdentityToUser(userId: string, profile: NormalizedSocialProfile) {
  return db.$transaction(async (tx: DbClient) => {
    const existingIdentity = await tx.authIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
        },
      },
    });

    if (existingIdentity && existingIdentity.userId !== userId) {
      return { ok: false as const, error: "provider_already_linked" };
    }

    if (existingIdentity?.userId === userId) {
      await tx.authIdentity.update({
        where: { id: existingIdentity.id },
        data: {
          providerEmail: profile.email,
          providerEmailVerified: profile.emailVerified,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          rawProfileJson: toJsonValue(profile.rawProfileJson),
        },
      });
      return { ok: true as const };
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { ok: false as const, error: "unauthorized" };
    }

    const existingSameProvider = await tx.authIdentity.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: profile.provider,
        },
      },
    });

    if (existingSameProvider) {
      return { ok: false as const, error: "provider_already_connected" };
    }

    let nextEmail = user.email;
    let nextEmailVerified = user.emailVerified;
    if (!user.email && profile.email) {
      const emailOwner = await tx.user.findUnique({
        where: { email: profile.email },
      });
      if (!emailOwner) {
        nextEmail = profile.email;
        nextEmailVerified = profile.emailVerified;
      }
    } else if (user.email && profile.email === user.email) {
      nextEmailVerified = user.emailVerified || profile.emailVerified;
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        email: nextEmail,
        emailVerified: nextEmailVerified,
        name: user.name ?? profile.displayName,
        avatarUrl: user.avatarUrl ?? profile.avatarUrl,
      },
    });

    await tx.authIdentity.create({
      data: {
        userId,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        providerEmail: profile.email,
        providerEmailVerified: profile.emailVerified,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        rawProfileJson: toJsonValue(profile.rawProfileJson),
      },
    });

    return { ok: true as const };
  });
}

export async function listLinkedAuthProviders(userId: string): Promise<ProviderStatus[]> {
  const identities = await db.authIdentity.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  const byProvider = new Map(identities.map((identity) => [identity.provider as SocialProvider, identity]));

  return socialProviderOrder.map((provider) => {
    const identity = byProvider.get(provider);
    return {
      provider,
      connected: Boolean(identity),
      configured: isSocialProviderConfigured(provider),
      providerEmail: identity?.providerEmail ?? null,
      providerEmailVerified: identity?.providerEmailVerified ?? false,
      displayName: identity?.displayName ?? null,
      avatarUrl: identity?.avatarUrl ?? null,
      linkedAt: identity?.createdAt.toISOString() ?? null,
    };
  });
}

export async function unlinkSocialProvider(userId: string, provider: SocialProvider) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      authIdentities: true,
    },
  });

  if (!user) {
    return { ok: false as const, error: "unauthorized", statusCode: 401 };
  }

  const identity = user.authIdentities.find((item) => item.provider === provider);
  if (!identity) {
    return { ok: false as const, error: "provider_not_linked", statusCode: 404 };
  }

  const hasPassword = Boolean(user.passwordHash);
  if (!hasPassword && user.authIdentities.length <= 1) {
    return { ok: false as const, error: "last_auth_method", statusCode: 400 };
  }

  await db.authIdentity.delete({
    where: { id: identity.id },
  });

  return { ok: true as const };
}

export async function finishOAuthCallback(args: {
  provider: SocialProvider;
  query: { code?: string; state?: string; error?: string; device_id?: string };
  currentUserId?: string | null;
  challenge: SocialChallenge | null;
}) {
  const provider = args.provider;
  if (provider === "TELEGRAM") {
    return {
      ok: false as const,
      redirectTo: buildFrontendLoginRedirect("social_provider_not_configured", provider),
    };
  }

  const challenge = args.challenge;
  if (!challenge || challenge.provider !== provider) {
    return {
      ok: false as const,
      redirectTo: buildFrontendLoginRedirect("social_state_invalid", provider),
    };
  }

  if (!args.query.state || args.query.state !== challenge.state) {
    return {
      ok: false as const,
      redirectTo: buildFrontendLoginRedirect("social_state_invalid", provider),
    };
  }

  if (args.query.error) {
    return {
      ok: false as const,
      redirectTo:
        challenge.mode === "link"
          ? buildHomeRedirect({
              socialLinkError: "social_login_cancelled",
              provider: providerToSlug(provider),
            })
          : buildFrontendLoginRedirect("social_login_cancelled", provider),
    };
  }

  if (!args.query.code) {
    return {
      ok: false as const,
      redirectTo: buildFrontendLoginRedirect("social_code_missing", provider),
    };
  }

  try {
    const tokenPayload = await fetchOAuthToken(
      provider,
      args.query.code,
      challenge.codeVerifier,
      args.query.device_id,
      challenge.state
    );
    const profile = await fetchProviderProfile(
      provider,
      tokenPayload.accessToken,
      tokenPayload.userId
    );

    if (challenge.mode === "link") {
      if (!args.currentUserId) {
        return {
          ok: false as const,
          redirectTo: buildFrontendLoginRedirect("login_required", provider),
        };
      }

      const linked = await linkSocialIdentityToUser(args.currentUserId, profile);
      if (!linked.ok) {
        return {
          ok: false as const,
          redirectTo: buildHomeRedirect({
            socialLinkError: linked.error,
            provider: providerToSlug(provider),
          }),
        };
      }

      return {
        ok: true as const,
        redirectTo: buildHomeRedirect({
          socialLinked: providerToSlug(provider),
        }),
      };
    }

    const resolved = await loginOrCreateSocialUser(profile);
    if (!resolved.ok) {
      if (resolved.error === "social_email_conflict") {
        return {
          ok: false as const,
          redirectTo: buildFrontendLoginRedirect(
            "social_email_conflict",
            provider,
            resolved.email
          ),
        };
      }

      return {
        ok: false as const,
        redirectTo: buildFrontendLoginRedirect(resolved.error, provider),
      };
    }

    const token = await createUserSession(resolved.userId);
    return {
      ok: true as const,
      token,
      redirectTo: resolved.isNewUser
        ? buildProfileRedirect({ socialSignup: providerToSlug(provider) })
        : `${appConfig.webOrigin.replace(/\/$/, "")}/`,
    };
  } catch (error) {
    console.error("social oauth callback failed", {
      provider,
      message: error instanceof Error ? error.message : "social_auth_failed",
    });
    return {
      ok: false as const,
      redirectTo: buildFrontendLoginRedirect("social_auth_failed", provider),
    };
  }
}

export async function finishTelegramVerification(args: {
  payload: Record<string, unknown>;
  currentUserId?: string | null;
  challenge: SocialChallenge | null;
}) {
  const challenge = args.challenge;
  if (!challenge || challenge.provider !== "TELEGRAM") {
    return {
      ok: false as const,
      error: "social_state_invalid",
      redirectTo: buildFrontendLoginRedirect("social_state_invalid", "TELEGRAM"),
      statusCode: 400,
    };
  }

  if (!verifyTelegramSignature(args.payload)) {
    return {
      ok: false as const,
      error: "telegram_auth_invalid",
      redirectTo:
        challenge.mode === "link"
          ? buildHomeRedirect({
              socialLinkError: "telegram_auth_invalid",
              provider: "telegram",
            })
          : buildFrontendLoginRedirect("telegram_auth_invalid", "TELEGRAM"),
      statusCode: 400,
    };
  }

  try {
    const profile = normalizeTelegramPayload(args.payload);
    if (challenge.mode === "link") {
      if (!args.currentUserId) {
        return {
          ok: false as const,
          error: "unauthorized",
          redirectTo: buildFrontendLoginRedirect("login_required", "TELEGRAM"),
          statusCode: 401,
        };
      }

      const linked = await linkSocialIdentityToUser(args.currentUserId, profile);
      if (!linked.ok) {
        return {
          ok: false as const,
          error: linked.error,
          redirectTo: buildHomeRedirect({
            socialLinkError: linked.error,
            provider: "telegram",
          }),
          statusCode: 400,
        };
      }

      return {
        ok: true as const,
        redirectTo: buildHomeRedirect({ socialLinked: "telegram" }),
        statusCode: 200,
      };
    }

    const resolved = await loginOrCreateSocialUser(profile);
    if (!resolved.ok) {
      return {
        ok: false as const,
        error: resolved.error,
        redirectTo: buildFrontendLoginRedirect(resolved.error, "TELEGRAM"),
        statusCode: 400,
      };
    }

    const token = await createUserSession(resolved.userId);
    return {
      ok: true as const,
      token,
      redirectTo: resolved.isNewUser
        ? buildProfileRedirect({ socialSignup: "telegram" })
        : `${appConfig.webOrigin.replace(/\/$/, "")}/`,
      statusCode: 200,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "social_auth_failed",
      redirectTo: buildFrontendLoginRedirect("social_auth_failed", "TELEGRAM"),
      statusCode: 400,
    };
  }
}

export function parseSocialProvider(slug?: string) {
  return slugToProvider(slug);
}

export function getSocialProviderPublicInfo() {
  return socialProviderOrder.map((provider) => ({
    provider,
    slug: providerToSlug(provider),
    label: providerLabel(provider),
    configured: isSocialProviderConfigured(provider),
  }));
}
