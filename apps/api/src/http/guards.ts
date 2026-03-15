import type { AuthUser } from "@superava/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { getUserFromSession } from "../auth/session.js";

export async function requireUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AuthUser | null> {
  const user = await getUserFromSession(request);
  if (!user) {
    reply.status(401).send({ error: "unauthorized" });
    return null;
  }

  return user;
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AuthUser | null> {
  const user = await requireUser(request, reply);
  if (!user) {
    return null;
  }

  if (user.role !== "ADMIN") {
    reply.status(403).send({ error: "forbidden" });
    return null;
  }

  return user;
}
