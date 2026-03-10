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
