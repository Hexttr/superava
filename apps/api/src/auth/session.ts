import { randomBytes } from "node:crypto";
import type { AuthUser } from "@superava/shared";
import type { FastifyRequest } from "fastify";
import { prisma } from "../db.js";

const SESSION_COOKIE = "session";
const SESSION_DAYS = 30;

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createUserSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
}

export async function getUserFromSession(
  request: FastifyRequest
): Promise<AuthUser | null> {
  const token = (request.cookies as Record<string, string>)?.[SESSION_COOKIE];
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await deleteUserSession(token);
    }
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}

export async function deleteUserSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}

export { SESSION_COOKIE };
