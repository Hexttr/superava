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
    {
      slug: "birthday-rooftop-sunset",
      title: "Birthday Sunset Rooftop",
      subtitle: "Luxury birthday scene at golden hour with a chic rooftop mood",
      group: "holiday",
      previewLabel: "Birthday",
      description:
        "Elegant birthday portrait on a luxury rooftop terrace with sunset light, champagne, and a premium magazine-style fashion mood.",
      promptSkeleton:
        "Create a highly realistic photo of an elegant woman sitting on the terrace of a luxury rooftop restaurant at sunset. She is seated sideways to the camera at a round white marble table, with a panoramic view of a big city skyline and tall skyscrapers in the background, all lit by warm golden hour light. She is wearing a long light-beige open coat, a plain white V-neck top tucked into high-waisted white cropped tailored trousers. On her feet are nude high-heel pumps with thin heels. She leans slightly back in a soft beige chair, with one leg crossed over the other, her pose relaxed, confident and feminine. One hand rests on a beige clutch on the table; on her wrist a gold bracelet, on her fingers a delicate ring, on her neck a thin gold chain with a small pendant, and elegant earrings in her ears. On the table there is a glass of champagne and a small white cup with saucer. The lighting is very soft and warm, emphasizing the beige-cream color palette of the outfit and the interior. The style of the shot is chic lifestyle and fashion photography for a business and luxury magazine, realistic, high detail, vertical composition.",
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
