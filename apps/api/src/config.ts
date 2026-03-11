import "dotenv/config";

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric environment variable: ${name}`);
  }

  return parsed;
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

const sessionSecret = process.env.SESSION_SECRET?.trim() || "dev-secret-change-in-prod";
if (isProduction && sessionSecret.length < 24) {
  throw new Error("SESSION_SECRET must be at least 24 characters in production");
}

export const appConfig = {
  nodeEnv,
  isProduction,
  apiHost: process.env.API_HOST?.trim() || "0.0.0.0",
  apiPort: getNumberEnv("API_PORT", 4000),
  webOrigin: process.env.WEB_ORIGIN?.trim() || "http://localhost:3000",
  authPublicUrl: process.env.AUTH_PUBLIC_URL?.trim() || process.env.WEB_ORIGIN?.trim() || "http://localhost:3000",
  sessionSecret,
  sessionMaxAgeSeconds: getNumberEnv("SESSION_MAX_AGE_SECONDS", 30 * 24 * 60 * 60),
  authRateLimitWindowMs: getNumberEnv("AUTH_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  authRateLimitMaxAttempts: getNumberEnv("AUTH_RATE_LIMIT_MAX_ATTEMPTS", 10),
  emailVerificationTtlHours: getNumberEnv("EMAIL_VERIFICATION_TTL_HOURS", 24),
  passwordResetTtlMinutes: getNumberEnv("PASSWORD_RESET_TTL_MINUTES", 30),
  resendApiKey: process.env.RESEND_API_KEY?.trim() || "",
  mailFrom: process.env.MAIL_FROM?.trim() || "",
  databaseUrl: getRequiredEnv("DATABASE_URL"),
};

if (isProduction && Boolean(appConfig.resendApiKey) !== Boolean(appConfig.mailFrom)) {
  throw new Error("RESEND_API_KEY and MAIL_FROM must be configured together in production");
}
