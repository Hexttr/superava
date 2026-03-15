import type { FastifyReply } from "fastify";
import { getObject } from "../storage.js";

export async function sendStoredImage(
  reply: FastifyReply,
  key: string,
  mimeType = "image/jpeg"
) {
  const buffer = await getObject(key);
  reply.header("content-type", mimeType);
  reply.header("cache-control", "public, max-age=3600");
  return reply.send(buffer);
}
