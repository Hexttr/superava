import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { demoGenerationPromptConfig } from "@superava/shared";

const prisma = new PrismaClient();

const PROMPT_PARTS = [
  {
    key: "base",
    label: "Основные правила идентичности",
    value:
      "CRITICAL: The generated person MUST be the exact same person from the reference photos. Do not alter, reinterpret, or change the face. Maintain identical: eye shape and spacing, nose shape and size, lip shape, jawline contour, facial proportions, skin tone, and bone structure. The output must be this specific individual—not a similar-looking person. Copy the face from references with maximum fidelity. Prioritize identity preservation over any other instruction. Avoid: face drift, different person, beauty filters, distorted anatomy, stylization that changes likeness. Create exactly one highly realistic photo.",
    sortOrder: 0,
  },
  {
    key: "profile_meta",
    label: "Мета профиля",
    value: "Reference photos cover {count} face angles. Profile completeness {percent}%.",
    sortOrder: 1,
  },
  {
    key: "closed_mouth",
    label: "Закрытый рот",
    value:
      "The subject has closed mouth in all reference photos. Keep mouth closed, neutral lips, no smile, no open mouth in the generated image.",
    sortOrder: 2,
  },
  {
    key: "short_expansion",
    label: "Расширение короткого промпта",
    value:
      "First, mentally expand this minimal request into a rich cinematic scene: environment, lighting, composition, props, styling. Then generate. User request: ",
    sortOrder: 3,
  },
  {
    key: "user_request_prefix",
    label: "Префикс запроса пользователя",
    value: "User request: ",
    sortOrder: 4,
  },
  {
    key: "enhance_portrait",
    label: "Улучшение портрета",
    value:
      "Apply subtle portrait enhancement: bright, expressive eyes with natural sparkle and lively gaze; soft, even skin tone with gentle retouching, no visible wrinkles or under-eye bags; well-lit, airy scene without dark or gloomy tones; polished, magazine-quality finish with flattering lighting.",
    sortOrder: 5,
  },
];

const CATEGORIES = [
  { name: "8 марта", sortOrder: 0 },
  { name: "Новый год", sortOrder: 1 },
  { name: "День рождения", sortOrder: 2 },
  { name: "День победы", sortOrder: 3 },
  { name: "23 февраля", sortOrder: 4 },
  { name: "Хэллоуин", sortOrder: 5 },
];

async function main() {
  await prisma.appConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      baseGenerationPrompt: demoGenerationPromptConfig.basePrompt,
      shortPromptMaxChars: 80,
      shortPromptMaxWords: 6,
    },
    update: {
      baseGenerationPrompt: demoGenerationPromptConfig.basePrompt,
      shortPromptMaxChars: 80,
      shortPromptMaxWords: 6,
    },
  });

  for (const part of PROMPT_PARTS) {
    await prisma.promptPart.upsert({
      where: { key: part.key },
      create: part,
      update: { label: part.label, value: part.value, sortOrder: part.sortOrder },
    });
  }

  const categoryRecords: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    const existing = await prisma.category.findFirst({ where: { name: cat.name } });
    if (existing) {
      categoryRecords[cat.name] = existing.id;
    } else {
      const created = await prisma.category.create({
        data: { name: cat.name, sortOrder: cat.sortOrder },
      });
      categoryRecords[cat.name] = created.id;
    }
  }

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
      categoryId: null as string | null,
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
      categoryId: categoryRecords["Новый год"] ?? null,
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
      categoryId: categoryRecords["День рождения"] ?? null,
    },
  ];

  for (const t of templates) {
    const { categoryId, ...rest } = t;
    await prisma.promptTemplate.upsert({
      where: { slug: t.slug },
      create: t,
      update: { ...rest, categoryId },
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

  console.log("Seed completed: prompt parts, categories, templates, and dev user/profile ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
