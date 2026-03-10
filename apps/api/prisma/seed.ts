import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { demoGenerationPromptConfig } from "@superava/shared";

const prisma = new PrismaClient();

async function main() {
  await prisma.appConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      baseGenerationPrompt: demoGenerationPromptConfig.basePrompt,
    },
    update: {
      baseGenerationPrompt: demoGenerationPromptConfig.basePrompt,
    },
  });

  const templates = [
    {
      slug: "vip-portrait",
      title: "VIP Portrait",
      subtitle: "Editorial light, premium styling, cinematic finish",
      group: "vip",
      previewLabel: "VIP",
      description:
        "Luxury portrait for profile photos, social media covers, and premium branding.",
      promptSkeleton:
        "Create a luxury editorial portrait. Preserve the subject's identity. Use soft studio lighting, shallow depth of field, premium styling.",
    },
    {
      slug: "holiday-hero",
      title: "Holiday Hero",
      subtitle: "Festive atmosphere with polished, photorealistic face match",
      group: "holiday",
      previewLabel: "Holiday",
      description:
        "Seasonal hero shot for greeting cards, holiday posts, and campaign visuals.",
      promptSkeleton:
        "Create a festive holiday portrait. Preserve the subject's identity. Warm lighting, seasonal background, photorealistic.",
    },
  ];

  for (const t of templates) {
    await prisma.promptTemplate.upsert({
      where: { slug: t.slug },
      create: t,
      update: t,
    });
  }

  const devUser = await prisma.user.upsert({
    where: { email: "dev@superava.local" },
    create: {
      email: "dev@superava.local",
      name: "Dev User",
    },
    update: {},
  });

  const existingProfile = await prisma.photoProfile.findUnique({
    where: { userId: devUser.id },
  });

  if (!existingProfile) {
    await prisma.photoProfile.create({
      data: {
        userId: devUser.id,
        displayName: "Alex",
      },
    });
  }

  console.log("Seed completed: templates and dev user/profile ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
