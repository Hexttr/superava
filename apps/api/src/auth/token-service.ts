import { randomBytes } from "node:crypto";
import { prisma } from "../db.js";
import { appConfig } from "../config.js";

function createOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

function withHoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function withMinutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export async function createEmailVerificationToken(userId: string): Promise<string> {
  await prisma.emailVerificationToken.deleteMany({
    where: {
      userId,
      OR: [{ consumedAt: null }, { expiresAt: { lt: new Date() } }],
    },
  });

  const token = createOpaqueToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      token,
      expiresAt: withHoursFromNow(appConfig.emailVerificationTtlHours),
    },
  });
  return token;
}

export async function verifyEmailToken(
  token: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record || record.consumedAt || record.expiresAt < new Date()) {
    return { ok: false, error: "invalid_or_expired_token" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
  ]);

  return { ok: true };
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  await prisma.passwordResetToken.deleteMany({
    where: {
      userId,
      OR: [{ consumedAt: null }, { expiresAt: { lt: new Date() } }],
    },
  });

  const token = createOpaqueToken();
  await prisma.passwordResetToken.create({
    data: {
      userId,
      token,
      expiresAt: withMinutesFromNow(appConfig.passwordResetTtlMinutes),
    },
  });
  return token;
}

export async function consumePasswordResetToken(
  token: string
): Promise<
  | { ok: true; userId: string }
  | { ok: false; error: string }
> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record || record.consumedAt || record.expiresAt < new Date()) {
    return { ok: false, error: "invalid_or_expired_token" };
  }

  if (record.user.status === "BLOCKED") {
    return { ok: false, error: "account_blocked" };
  }

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  return { ok: true, userId: record.userId };
}
