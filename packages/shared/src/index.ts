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

export const generationModeSchema = z.enum(["free", "template", "reference"]);
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
  categoryId: z.string().nullable().optional(),
  previewKey: z.string().nullable().optional(),
});

export type PromptTemplate = z.infer<typeof promptTemplateSchema>;

export const generationPromptConfigSchema = z.object({
  basePrompt: z.string(),
});

export type GenerationPromptConfig = z.infer<typeof generationPromptConfigSchema>;

export const promptPartConstructorSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export const promptConstructorConfigSchema = z.object({
  parts: z.array(promptPartConstructorSchema),
  shortPromptMaxChars: z.number(),
  shortPromptMaxWords: z.number(),
});

export type PromptConstructorConfig = z.infer<typeof promptConstructorConfigSchema>;

export const DEFAULT_GENERATION_BASE_PROMPT =
  "CRITICAL: The generated person MUST be the exact same person from the reference photos. Do not alter, reinterpret, or change the face. Maintain identical: eye shape and spacing, nose shape and size, lip shape, jawline contour, facial proportions, skin tone, and bone structure. The output must be this specific individual—not a similar-looking person. Copy the face from references with maximum fidelity. Prioritize identity preservation over any other instruction. Avoid: face drift, different person, beauty filters, distorted anatomy, stylization that changes likeness. Create exactly one highly realistic photo.";

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

const CLOSED_MOUTH_PROMPT =
  "The subject has closed mouth in all reference photos. Keep mouth closed, neutral lips, no smile, no open mouth in the generated image.";

const SHORT_PROMPT_EXPANSION_PREFIX =
  "First, mentally expand this minimal request into a rich cinematic scene: imagine environment, lighting, composition, props, and styling. Then generate the image. User request: ";

function isShortUserPrompt(
  prompt: string,
  maxChars: number,
  maxWords: number
): boolean {
  const trimmed = prompt.trim();
  if (!trimmed) return false;
  const wordCount = trimmed.split(/\s+/).length;
  return trimmed.length < maxChars || wordCount < maxWords;
}

export function buildGenerationPrompt(args: {
  input: CreateGenerationInput;
  profile: PhotoProfile;
  template?: PromptTemplate;
  config?: GenerationPromptConfig;
  promptConstructor?: PromptConstructorConfig;
}) {
  const constructor = args.promptConstructor;
  const partsMap = constructor
    ? new Map(constructor.parts.map((p) => [p.key, p.value]))
    : null;
  const maxChars = constructor?.shortPromptMaxChars ?? 80;
  const maxWords = constructor?.shortPromptMaxWords ?? 6;

  const base =
    partsMap?.get("base") ?? args.config?.basePrompt ?? DEFAULT_GENERATION_BASE_PROMPT;

  const count = args.profile.shots.filter((shot) => shot.status !== "missing").length;
  const percent = args.profile.completionPercent;
  const profileMetaTemplate = partsMap?.get("profile_meta") ?? `Reference photos cover ${count} face angles. Profile completeness: ${percent}%.`;
  const profileMeta = profileMetaTemplate
    .replace(/\{count\}/g, String(count))
    .replace(/\{percent\}/g, String(percent));

  const hasSmileShot = args.profile.shots.some(
    (s) => s.type === "front_smile" && s.status !== "missing"
  );
  const closedMouthRule = !hasSmileShot
    ? (partsMap?.get("closed_mouth") ?? CLOSED_MOUTH_PROMPT)
    : undefined;

  let sceneRequest: string | undefined;
  const userPrompt = args.input.prompt?.trim();
  if (args.template) {
    sceneRequest = args.template.promptSkeleton
      ? `${partsMap?.get("user_request_prefix") ?? "User request: "}${args.template.promptSkeleton}.`
      : undefined;
  } else if (userPrompt) {
    sceneRequest =
      isShortUserPrompt(userPrompt, maxChars, maxWords)
        ? `${partsMap?.get("short_expansion") ?? SHORT_PROMPT_EXPANSION_PREFIX}${userPrompt}.`
        : `${partsMap?.get("user_request_prefix") ?? "User request: "}${userPrompt}.`;
  }

  const enhancePortrait = args.input.enhancePortrait
    ? (partsMap?.get("enhance_portrait") ?? ENHANCE_PORTRAIT_PROMPT)
    : undefined;

  const promptParts = [
    base,
    profileMeta,
    closedMouthRule,
    sceneRequest,
    enhancePortrait,
  ].filter(Boolean);

  return promptParts.join(" ");
}

const REFERENCE_SCENE_PREFIX =
  "Create a photo that exactly matches this scene description. The subject's face must match the provided reference photos. ";

export function buildReferenceModePrompt(args: {
  sceneDescription: string;
  userComment?: string;
  profile: PhotoProfile;
  enhancePortrait: boolean;
  promptConstructor?: PromptConstructorConfig;
}) {
  const partsMap = args.promptConstructor
    ? new Map(args.promptConstructor.parts.map((p) => [p.key, p.value]))
    : null;

  const base =
    partsMap?.get("base") ?? DEFAULT_GENERATION_BASE_PROMPT;

  const count = args.profile.shots.filter((shot) => shot.status !== "missing").length;
  const percent = args.profile.completionPercent;
  const profileMetaTemplate =
    partsMap?.get("profile_meta") ??
    `Reference photos cover ${count} face angles. Profile completeness: ${percent}%.`;
  const profileMeta = profileMetaTemplate
    .replace(/\{count\}/g, String(count))
    .replace(/\{percent\}/g, String(percent));

  const hasSmileShot = args.profile.shots.some(
    (s) => s.type === "front_smile" && s.status !== "missing"
  );
  const closedMouthRule = !hasSmileShot
    ? (partsMap?.get("closed_mouth") ?? "The subject has closed mouth in all reference photos. Keep mouth closed, neutral lips, no smile.")
    : undefined;

  const scenePart = `${REFERENCE_SCENE_PREFIX}Scene: ${args.sceneDescription}.`;
  const userCommentPart = args.userComment?.trim()
    ? `Additional modification requested: ${args.userComment}.`
    : undefined;

  const enhancePortrait = args.enhancePortrait
    ? (partsMap?.get("enhance_portrait") ?? ENHANCE_PORTRAIT_PROMPT)
    : undefined;

  const promptParts = [
    base,
    profileMeta,
    closedMouthRule,
    scenePart,
    userCommentPart,
    enhancePortrait,
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
  referencePhotoKey: z.string().optional(),
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
