import bcrypt from "bcrypt";
import { prisma } from "../db.js";
import { createUserSession } from "./session.js";

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function registerUser(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string; userId?: string }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || trimmed.length < 3) {
    return { ok: false, error: "invalid_email" };
  }
  if (!password || password.length < 6) {
    return { ok: false, error: "password_too_short" };
  }

  const existing = await prisma.user.findUnique({
    where: { email: trimmed },
  });
  if (existing) {
    return { ok: false, error: "email_taken" };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: trimmed,
      name: trimmed.split("@")[0],
      passwordHash,
      emailVerified: false,
      status: "ACTIVE",
    },
  });

  return { ok: true, userId: user.id };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string; userId?: string }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !password) {
    return { ok: false, error: "invalid_credentials" };
  }

  const user = await prisma.user.findUnique({
    where: { email: trimmed },
  });
  if (!user || !user.passwordHash) {
    return { ok: false, error: "invalid_credentials" };
  }
  if (user.status === "BLOCKED") {
    return { ok: false, error: "account_blocked" };
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return { ok: false, error: "invalid_credentials" };
  }

  return { ok: true, userId: user.id };
}

export async function registerAndCreateSession(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string; token?: string }> {
  const result = await registerUser(email, password);
  if (!result.ok || !result.userId) {
    return { ok: false, error: result.error };
  }

  const token = await createUserSession(result.userId);
  return { ok: true, token };
}

export async function resetUserPassword(
  userId: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  if (!password || password.length < 6) {
    return { ok: false, error: "password_too_short" };
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
    prisma.session.deleteMany({
      where: { userId },
    }),
  ]);

  return { ok: true };
}

export async function loginAndCreateSession(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string; token?: string }> {
  const result = await loginUser(email, password);
  if (!result.ok || !result.userId) {
    return { ok: false, error: result.error };
  }

  const token = await createUserSession(result.userId);
  return { ok: true, token };
}
