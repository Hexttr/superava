import { apiRoutes, demoGenerationPromptConfig } from "@superava/shared";
import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { sendStoredImage } from "../http/image-response.js";

export async function registerCatalogRoutes(app: FastifyInstance) {
  app.get(apiRoutes.templates, async () => {
    const items = await prisma.promptTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ categoryId: "asc" }, { group: "asc" }, { title: "asc" }],
      include: { category: true },
    });

    return {
      items: items.map((template) => ({
        ...template,
        categoryId: template.categoryId,
        previewKey: template.previewKey,
      })),
    };
  });

  app.get("/api/v1/categories", async () => {
    const items = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return { items };
  });

  app.get("/api/v1/categories/:id/preview", async (request, reply) => {
    const id = (request.params as { id?: string }).id;
    if (!id) return reply.status(400).send({ error: "id required" });
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category?.previewKey) return reply.status(404).send({ error: "preview_not_found" });
    return sendStoredImage(reply, category.previewKey);
  });

  app.get("/api/v1/templates/:id/preview", async (request, reply) => {
    const id = (request.params as { id?: string }).id;
    if (!id) return reply.status(400).send({ error: "id required" });
    const template = await prisma.promptTemplate.findUnique({ where: { id } });
    if (!template?.previewKey) return reply.status(404).send({ error: "preview_not_found" });
    return sendStoredImage(reply, template.previewKey);
  });

  app.get("/api/v1/config/prompt-constructor", async () => {
    const [parts, config] = await Promise.all([
      prisma.promptPart.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.appConfig.findUnique({ where: { id: "default" } }),
    ]);
    return {
      parts,
      shortPromptMaxChars: config?.shortPromptMaxChars ?? 80,
      shortPromptMaxWords: config?.shortPromptMaxWords ?? 6,
    };
  });

  app.get(apiRoutes.generationPromptConfig, async () => {
    const config = await prisma.appConfig.findUnique({
      where: { id: "default" },
    });

    return {
      basePrompt: config?.baseGenerationPrompt ?? demoGenerationPromptConfig.basePrompt,
    };
  });
}
