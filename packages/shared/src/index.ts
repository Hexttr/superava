import { z } from "zod";

export const shotTypeSchema = z.enum([
  "front_neutral",
  "front_smile",
  "left_45",
  "right_45",
  "left_profile",
  "right_profile",
]);

export type ShotType = z.infer<typeof shotTypeSchema>;

export const generationModeSchema = z.enum(["free", "template"]);
export type GenerationMode = z.infer<typeof generationModeSchema>;

export const generationStatusSchema = z.enum([
  "queued",
  "processing",
  "finalizing",
  "completed",
  "failed",
]);
export type GenerationStatus = z.infer<typeof generationStatusSchema>;

export const templateGroupSchema = z.enum(["vip", "holiday"]);
export type TemplateGroup = z.infer<typeof templateGroupSchema>;

export const profileShotSchema = z.object({
  id: z.string(),
  type: shotTypeSchema,
  status: z.enum(["missing", "uploaded", "approved"]),
  guidance: z.string(),
  exampleAngle: z.string(),
  previewUrl: z.string().optional(),
  previewVersion: z.string().optional(),
});

export type ProfileShot = z.infer<typeof profileShotSchema>;

export const photoProfileSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  completionPercent: z.number().min(0).max(100),
  shots: z.array(profileShotSchema),
});

export type PhotoProfile = z.infer<typeof photoProfileSchema>;

export const promptTemplateSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string(),
  group: templateGroupSchema,
  previewLabel: z.string(),
  description: z.string(),
  promptSkeleton: z.string(),
});

export type PromptTemplate = z.infer<typeof promptTemplateSchema>;

export const generationPromptConfigSchema = z.object({
  basePrompt: z.string(),
});

export type GenerationPromptConfig = z.infer<typeof generationPromptConfigSchema>;

export const DEFAULT_GENERATION_BASE_PROMPT =
  "Analyze all provided face photos as references of the same real person from multiple angles. Create exactly one highly realistic professional photo with studio-grade lighting, realistic skin texture, maximum facial likeness, and stable identity preservation. The generated person must be this exact person, with special attention to facial structure, eyes, nose, lips, jawline, skin tone, and overall resemblance. Prioritize realism, professional photography quality, and consistency over stylization. Avoid face drift, beauty-filter skin, duplicate people, distorted anatomy, and any changes that weaken resemblance unless explicitly requested.";

export function normalizeGeminiErrorMessage(message?: string | null) {
  const normalized = message?.trim();

  if (!normalized) {
    return "Не удалось получить ответ от Gemini.";
  }

  const lower = normalized.toLowerCase();

  if (
    lower.includes("resource has been exhausted") ||
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("429")
  ) {
    return "Лимит Gemini временно исчерпан. Подождите немного и попробуйте снова.";
  }

  if (lower.includes("user location is not supported")) {
    return "Gemini отклонил запрос по региону. Нужно проверить маршрут через VPN или proxy.";
  }

  if (lower.includes("api key not valid") || lower.includes("api_key_invalid")) {
    return "Gemini отклонил API-ключ. Проверьте актуальность ключа.";
  }

  if (lower.includes("deadline") || lower.includes("timed out") || lower.includes("timeout")) {
    return "Gemini отвечает слишком долго. Попробуйте повторить запрос.";
  }

  return normalized;
}

export const ENHANCE_PORTRAIT_PROMPT =
  "Apply subtle portrait enhancement: bright, expressive eyes with natural sparkle and lively gaze; soft, even skin tone with gentle retouching, no visible wrinkles or under-eye bags; well-lit, airy scene without dark or gloomy tones; polished, magazine-quality finish with flattering lighting.";

export function buildGenerationPrompt(args: {
  input: CreateGenerationInput;
  profile: PhotoProfile;
  template?: PromptTemplate;
  config?: GenerationPromptConfig;
}) {
  const promptParts = [
    args.config?.basePrompt || DEFAULT_GENERATION_BASE_PROMPT,
    args.template?.promptSkeleton ? `Template direction: ${args.template.promptSkeleton}` : undefined,
    args.template?.title ? `Template title: ${args.template.title}.` : undefined,
    args.input.prompt ? `User request: ${args.input.prompt}.` : undefined,
    `Reference photos cover ${args.profile.shots.filter((shot) => shot.status !== "missing").length} face angles.`,
    `Profile completeness: ${args.profile.completionPercent}%.`,
    args.input.enhancePortrait ? ENHANCE_PORTRAIT_PROMPT : undefined,
  ].filter(Boolean);

  return promptParts.join(" ");
}

export const generationRecordSchema = z.object({
  id: z.string(),
  mode: generationModeSchema,
  status: generationStatusSchema,
  title: z.string(),
  subtitle: z.string(),
  createdAt: z.string(),
  previewUrl: z.string().optional(),
});

export type GenerationRecord = z.infer<typeof generationRecordSchema>;

export const createGenerationInputSchema = z.object({
  mode: generationModeSchema,
  prompt: z.string().min(1).max(1200).optional(),
  templateId: z.string().optional(),
  enhancePortrait: z.boolean().optional(),
});

export type CreateGenerationInput = z.infer<typeof createGenerationInputSchema>;

export const defaultProfileShots: ProfileShot[] = [
  {
    id: "shot-front-neutral",
    type: "front_neutral",
    status: "approved",
    guidance: "Смотрите прямо, лицо ровно.",
    exampleAngle: "ровно",
  },
  {
    id: "shot-front-smile",
    type: "front_smile",
    status: "uploaded",
    guidance: "Тот же ракурс, легкая улыбка.",
    exampleAngle: "ровно",
  },
  {
    id: "shot-left-45",
    type: "left_45",
    status: "approved",
    guidance: "Повернитесь немного влево.",
    exampleAngle: "3/4 влево",
  },
  {
    id: "shot-right-45",
    type: "right_45",
    status: "approved",
    guidance: "Повернитесь немного вправо.",
    exampleAngle: "3/4 вправо",
  },
  {
    id: "shot-left-profile",
    type: "left_profile",
    status: "uploaded",
    guidance: "Полный левый профиль.",
    exampleAngle: "левый бок",
  },
  {
    id: "shot-right-profile",
    type: "right_profile",
    status: "missing",
    guidance: "Полный правый профиль.",
    exampleAngle: "правый бок",
  },
];

export const demoPhotoProfile: PhotoProfile = {
  id: "profile-demo",
  displayName: "Alex",
  completionPercent: 83,
  shots: defaultProfileShots,
};

export const demoTemplates: PromptTemplate[] = [
  {
    id: "template-vip-portrait",
    slug: "vip-portrait",
    title: "VIP Portrait",
    subtitle: "Премиальный портрет",
    group: "vip",
    previewLabel: "VIP",
    description: "Дорогой свет, чистый портрет, эффектный кадр.",
    promptSkeleton:
      "Luxury editorial portrait, premium styling, professional studio light, cinematic finish, photorealistic skin texture.",
  },
  {
    id: "template-holiday-hero",
    slug: "holiday-hero",
    title: "Holiday Hero",
    subtitle: "Праздничный кадр",
    group: "holiday",
    previewLabel: "Holiday",
    description: "Праздничная сцена с аккуратной посадкой лица.",
    promptSkeleton:
      "Festive holiday portrait, polished lighting, elegant seasonal atmosphere, photorealistic result, clean face match.",
  },
  {
    id: "template-birthday-rooftop-sunset",
    slug: "birthday-rooftop-sunset",
    title: "Birthday Sunset Rooftop",
    subtitle: "День рождения на rooftop-террасе",
    group: "holiday",
    previewLabel: "Birthday",
    description: "Закатный ужин на крыше с luxury-настроением и журнальной подачей.",
    promptSkeleton:
      "Create a highly realistic photo of an elegant woman sitting on the terrace of a luxury rooftop restaurant at sunset. She is seated sideways to the camera at a round white marble table, with a panoramic view of a big city skyline and tall skyscrapers in the background, all lit by warm golden hour light. She is wearing a long light-beige open coat, a plain white V-neck top tucked into high-waisted white cropped tailored trousers. On her feet are nude high-heel pumps with thin heels. She leans slightly back in a soft beige chair, with one leg crossed over the other, her pose relaxed, confident and feminine. One hand rests on a beige clutch on the table; on her wrist a gold bracelet, on her fingers a delicate ring, on her neck a thin gold chain with a small pendant, and elegant earrings in her ears. On the table there is a glass of champagne and a small white cup with saucer. The lighting is very soft and warm, emphasizing the beige-cream color palette of the outfit and the interior. The style of the shot is chic lifestyle and fashion photography for a business and luxury magazine, realistic, high detail, vertical composition.",
  },
];

export const demoGenerationPromptConfig: GenerationPromptConfig = {
  basePrompt: DEFAULT_GENERATION_BASE_PROMPT,
};

export const demoGenerations: GenerationRecord[] = [
  {
    id: "gen-queued",
    mode: "template",
    status: "queued",
    title: "Holiday Hero",
    subtitle: "Готовим кадры",
    createdAt: "2026-03-10T12:00:00.000Z",
  },
  {
    id: "gen-processing",
    mode: "free",
    status: "processing",
    title: "Tokyo rooftop at night",
    subtitle: "Генерируем",
    createdAt: "2026-03-10T11:45:00.000Z",
  },
  {
    id: "gen-completed",
    mode: "template",
    status: "completed",
    title: "VIP Portrait",
    subtitle: "Готово",
    createdAt: "2026-03-10T10:15:00.000Z",
  },
];

export const apiRoutes = {
  health: "/health",
  profile: "/api/v1/profile",
  templates: "/api/v1/templates",
  generations: "/api/v1/generations",
  generationPromptConfig: "/api/v1/config/generation-prompt",
} as const;
