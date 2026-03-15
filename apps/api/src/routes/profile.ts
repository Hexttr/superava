import { apiRoutes, shotTypeSchema } from "@superava/shared";
import type { FastifyInstance } from "fastify";
import { getOrCreateProfile, toApiProfile, uploadProfileShot } from "../services/profile.js";
import { requireUser } from "../http/guards.js";
import { sendStoredImage } from "../http/image-response.js";

export async function registerProfileRoutes(app: FastifyInstance) {
  app.get(apiRoutes.profile, async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const profile = await getOrCreateProfile(user.id);
    return toApiProfile(profile);
  });

  app.post("/api/v1/profile/shots/:shotType", async (request, reply) => {
    const parseResult = shotTypeSchema.safeParse(
      (request.params as { shotType?: string }).shotType
    );

    if (!parseResult.success) {
      return reply.status(400).send({
        error: "invalid_shot_type",
        issues: parseResult.error.issues,
      });
    }

    const file = await request.file();

    if (!file) {
      return reply.status(400).send({
        error: "missing_file",
      });
    }

    const buffer = await file.toBuffer();
    const user = await requireUser(request, reply);
    if (!user) return;
    const profile = await getOrCreateProfile(user.id);
    const result = await uploadProfileShot(profile.id, parseResult.data, buffer);

    if (!result.ok) {
      return reply.status(400).send({
        error: result.error ?? "upload_failed",
      });
    }

    const updatedProfile = await getOrCreateProfile(user.id);

    return reply.status(201).send({
      ok: true,
      profile: toApiProfile(updatedProfile),
    });
  });

  app.get("/api/v1/profile/shots/:shotType/preview", async (request, reply) => {
    const parseResult = shotTypeSchema.safeParse(
      (request.params as { shotType?: string }).shotType
    );

    if (!parseResult.success) {
      return reply.status(400).send({
        error: "invalid_shot_type",
        issues: parseResult.error.issues,
      });
    }

    const user = await requireUser(request, reply);
    if (!user) return;
    const profile = await getOrCreateProfile(user.id);
    const shot = profile.shots.find((item) => item.shotType === parseResult.data);

    if (!shot?.previewKey) {
      return reply.status(404).send({
        error: "preview_not_found",
      });
    }

    return sendStoredImage(reply, shot.previewKey);
  });
}
