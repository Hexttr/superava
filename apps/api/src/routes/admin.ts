import {
  adminUserSchema,
  authUserSchema,
  demoGenerationPromptConfig,
  userRoleSchema,
  userStatusSchema,
} from "@superava/shared";
import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { validateImage } from "../image-pipeline.js";
import { categoryPreviewKey, putObject, templatePreviewKey } from "../storage.js";
import { requireAdmin, requireUser } from "../http/guards.js";

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get("/api/v1/admin/auth/me", async (request, reply) => {
    const user = await requireAdmin(request, reply);
    if (!user) {
      return;
    }

    return reply.send(authUserSchema.parse(user));
  });

  app.get("/api/v1/admin/categories", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const items = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return { items };
  });

  app.post("/api/v1/admin/categories", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const body = request.body as { name?: string; sortOrder?: number };
    if (!body?.name || typeof body.name !== "string") {
      return reply.status(400).send({ error: "name required" });
    }
    const created = await prisma.category.create({
      data: {
        name: body.name,
        sortOrder: body.sortOrder ?? 0,
      },
    });
    return reply.status(201).send(created);
  });

  app.patch("/api/v1/admin/categories/:id", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const id = (request.params as { id?: string }).id;
    if (!id) return reply.status(400).send({ error: "id required" });
    const body = request.body as { name?: string; previewKey?: string; sortOrder?: number };
    const data: Record<string, unknown> = {};
    if (typeof body?.name === "string") data.name = body.name;
    if (typeof body?.previewKey === "string") data.previewKey = body.previewKey;
    if (typeof body?.sortOrder === "number") data.sortOrder = body.sortOrder;
    const updated = await prisma.category.update({
      where: { id },
      data,
    });
    return reply.send(updated);
  });

  app.post("/api/v1/admin/categories/:id/preview", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const id = (request.params as { id?: string }).id;
    if (!id) return reply.status(400).send({ error: "id required" });
    const file = await request.file();
    if (!file) return reply.status(400).send({ error: "missing_file" });
    const buffer = await file.toBuffer();
    const validation = await validateImage(buffer);
    if (!validation.ok) return reply.status(400).send({ error: validation.error ?? "invalid_image" });
    const key = categoryPreviewKey(id);
    await putObject(key, buffer, "image/jpeg");
    const updated = await prisma.category.update({
      where: { id },
      data: { previewKey: key },
    });
    return reply.status(201).send(updated);
  });

  app.delete("/api/v1/admin/categories/:id", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const id = (request.params as { id?: string }).id;
    if (!id) return reply.status(400).send({ error: "id required" });
    await prisma.category.delete({ where: { id } });
    return reply.status(204).send();
  });

  app.get("/api/v1/admin/templates", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const items = await prisma.promptTemplate.findMany({
      orderBy: [{ categoryId: "asc" }, { title: "asc" }],
      include: { category: true },
    });
    return { items };
  });

  app.post("/api/v1/admin/templates", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const body = request.body as {
      slug?: string;
      title?: string;
      subtitle?: string;
      group?: string;
      previewLabel?: string;
      description?: string;
      promptSkeleton?: string;
      categoryId?: string | null;
      priceMinor?: number;
      isActive?: boolean;
    };
    if (!body?.slug || !body?.title) {
      return reply.status(400).send({ error: "slug and title required" });
    }
    const created = await prisma.promptTemplate.create({
      data: {
        slug: body.slug,
        title: body.title,
        subtitle: body.subtitle ?? "",
        group: body.group ?? "holiday",
        previewLabel: body.previewLabel ?? "",
        description: body.description ?? "",
        promptSkeleton: body.promptSkeleton ?? "",
        categoryId: body.categoryId ?? null,
        priceMinor: Math.max(0, body.priceMinor ?? 0),
        isActive: body.isActive ?? true,
      },
    });
    return reply.status(201).send(created);
  });

  app.patch("/api/v1/admin/templates/:id", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const id = (request.params as { id?: string }).id;
    if (!id) return reply.status(400).send({ error: "id required" });
    const body = request.body as {
      slug?: string;
      title?: string;
      subtitle?: string;
      group?: string;
      previewLabel?: string;
      description?: string;
      promptSkeleton?: string;
      categoryId?: string | null;
      previewKey?: string;
      priceMinor?: number;
      isActive?: boolean;
    };
    const data: Record<string, unknown> = {};
    const fields = [
      "slug",
      "title",
      "subtitle",
      "group",
      "previewLabel",
      "description",
      "promptSkeleton",
      "categoryId",
      "previewKey",
      "isActive",
    ] as const;
    for (const field of fields) {
      if (body?.[field] !== undefined) data[field] = body[field];
    }
    if (typeof body?.priceMinor === "number") {
      data.priceMinor = Math.max(0, body.priceMinor);
    }
    const updated = await prisma.promptTemplate.update({
      where: { id },
      data,
    });
    return reply.send(updated);
  });

  app.post("/api/v1/admin/templates/:id/preview", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const id = (request.params as { id?: string }).id;
    if (!id) return reply.status(400).send({ error: "id required" });
    const file = await request.file();
    if (!file) return reply.status(400).send({ error: "missing_file" });
    const buffer = await file.toBuffer();
    const validation = await validateImage(buffer);
    if (!validation.ok) return reply.status(400).send({ error: validation.error ?? "invalid_image" });
    const key = templatePreviewKey(id);
    await putObject(key, buffer, "image/jpeg");
    const updated = await prisma.promptTemplate.update({
      where: { id },
      data: { previewKey: key },
    });
    return reply.status(201).send(updated);
  });

  app.delete("/api/v1/admin/templates/:id", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const id = (request.params as { id?: string }).id;
    if (!id) return reply.status(400).send({ error: "id required" });
    await prisma.promptTemplate.delete({ where: { id } });
    return reply.status(204).send();
  });

  app.get("/api/v1/admin/prompt-parts", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const items = await prisma.promptPart.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return { items };
  });

  app.patch("/api/v1/admin/prompt-parts/:key", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const key = (request.params as { key?: string }).key;
    if (!key) return reply.status(400).send({ error: "key required" });
    const body = request.body as { label?: string; value?: string; sortOrder?: number };
    const data: Record<string, unknown> = {};
    if (typeof body?.label === "string") data.label = body.label;
    if (typeof body?.value === "string") data.value = body.value;
    if (typeof body?.sortOrder === "number") data.sortOrder = body.sortOrder;
    const updated = await prisma.promptPart.update({
      where: { key },
      data,
    });
    return reply.send(updated);
  });

  app.get("/api/v1/admin/app-config", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const config = await prisma.appConfig.findUnique({
      where: { id: "default" },
    });

    return {
      id: "default",
      billingEnabled: config?.billingEnabled ?? false,
      textGenerationPriceMinor: config?.textGenerationPriceMinor ?? 0,
      photoGenerationPriceMinor: config?.photoGenerationPriceMinor ?? 0,
      currency: config?.currency ?? "RUB",
    };
  });

  app.patch("/api/v1/admin/app-config", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const body = request.body as {
      billingEnabled?: boolean;
      textGenerationPriceMinor?: number;
      photoGenerationPriceMinor?: number;
    };
    const data: Record<string, unknown> = {};
    if (typeof body?.billingEnabled === "boolean") data.billingEnabled = body.billingEnabled;
    if (typeof body?.textGenerationPriceMinor === "number") {
      data.textGenerationPriceMinor = Math.max(0, body.textGenerationPriceMinor);
    }
    if (typeof body?.photoGenerationPriceMinor === "number") {
      data.photoGenerationPriceMinor = Math.max(0, body.photoGenerationPriceMinor);
    }

    const updated = await prisma.appConfig.upsert({
      where: { id: "default" },
      update: data,
      create: {
        id: "default",
        baseGenerationPrompt: demoGenerationPromptConfig.basePrompt,
        billingEnabled: typeof body?.billingEnabled === "boolean" ? body.billingEnabled : false,
        textGenerationPriceMinor: Math.max(0, body?.textGenerationPriceMinor ?? 0),
        photoGenerationPriceMinor: Math.max(0, body?.photoGenerationPriceMinor ?? 0),
        currency: "RUB",
      },
    });

    return reply.send({
      id: updated.id,
      billingEnabled: updated.billingEnabled,
      textGenerationPriceMinor: updated.textGenerationPriceMinor,
      photoGenerationPriceMinor: updated.photoGenerationPriceMinor,
      currency: updated.currency,
    });
  });

  app.get("/api/v1/admin/users", async (request, reply) => {
    const admin = await requireUser(request, reply);
    if (!admin) return;
    if (admin.role !== "ADMIN") {
      return reply.status(403).send({ error: "forbidden" });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    return {
      items: users.map((user) =>
        adminUserSchema.parse({
          ...user,
          createdAt: user.createdAt.toISOString(),
        })
      ),
    };
  });

  app.patch("/api/v1/admin/users/:id", async (request, reply) => {
    const admin = await requireUser(request, reply);
    if (!admin) return;
    if (admin.role !== "ADMIN") {
      return reply.status(403).send({ error: "forbidden" });
    }

    const id = (request.params as { id?: string }).id;
    if (!id) return reply.status(400).send({ error: "id required" });

    const body = request.body as { role?: string; status?: string };
    const parsedRole = userRoleSchema.safeParse(body?.role);
    const parsedStatus = userStatusSchema.safeParse(body?.status);
    if (!parsedRole.success && !parsedStatus.success) {
      return reply.status(400).send({ error: "invalid_role_or_status" });
    }

    if (admin.id === id && parsedRole.success && parsedRole.data !== "ADMIN") {
      return reply.status(400).send({ error: "cannot_demote_self" });
    }
    if (admin.id === id && parsedStatus.success && parsedStatus.data !== "ACTIVE") {
      return reply.status(400).send({ error: "cannot_block_self" });
    }

    const data: { role?: "USER" | "ADMIN"; status?: "ACTIVE" | "BLOCKED" } = {};
    if (parsedRole.success) {
      data.role = parsedRole.data;
    }
    if (parsedStatus.success) {
      data.status = parsedStatus.data;
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    return reply.send(
      adminUserSchema.parse({
        ...updated,
        createdAt: updated.createdAt.toISOString(),
      })
    );
  });

  app.delete("/api/v1/admin/users/:id", async (request, reply) => {
    const admin = await requireUser(request, reply);
    if (!admin) return;
    if (admin.role !== "ADMIN") {
      return reply.status(403).send({ error: "forbidden" });
    }

    const id = (request.params as { id?: string }).id;
    if (!id) return reply.status(400).send({ error: "id required" });

    if (admin.id === id) {
      return reply.status(400).send({ error: "cannot_delete_self" });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
      },
    });

    if (!target) {
      return reply.status(404).send({ error: "user_not_found" });
    }

    if (target.role === "ADMIN") {
      const otherAdminsCount = await prisma.user.count({
        where: {
          role: "ADMIN",
          NOT: { id },
        },
      });

      if (otherAdminsCount === 0) {
        return reply.status(400).send({ error: "cannot_delete_last_admin" });
      }
    }

    await prisma.user.delete({
      where: { id },
    });

    return reply.status(204).send();
  });
}
