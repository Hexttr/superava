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

export const generationPricingTypeSchema = z.enum(["TEXT", "TEMPLATE", "REFERENCE"]);
export type GenerationPricingType = z.infer<typeof generationPricingTypeSchema>;

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

export const currencyCodeSchema = z.enum(["RUB"]);
export type CurrencyCode = z.infer<typeof currencyCodeSchema>;

export const generationBillingStatusSchema = z.enum([
  "NONE",
  "RESERVED",
  "CAPTURED",
  "RELEASED",
  "REFUNDED",
]);
export type GenerationBillingStatus = z.infer<typeof generationBillingStatusSchema>;

export const userRoleSchema = z.enum(["USER", "ADMIN"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userStatusSchema = z.enum(["ACTIVE", "BLOCKED"]);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const socialAuthProviderSchema = z.enum([
  "YANDEX",
  "VK",
  "TELEGRAM",
  "MAILRU",
  "OK",
]);
export type SocialAuthProvider = z.infer<typeof socialAuthProviderSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  role: userRoleSchema,
  status: userStatusSchema,
  emailVerified: z.boolean(),
});

export type AuthUser = z.infer<typeof authUserSchema>;

export const adminUserSchema = authUserSchema.extend({
  createdAt: z.string(),
});

export type AdminUser = z.infer<typeof adminUserSchema>;

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

export const linkedAuthProviderSchema = z.object({
  provider: socialAuthProviderSchema,
  connected: z.boolean(),
  configured: z.boolean(),
  providerEmail: z.string().nullable().optional(),
  providerEmailVerified: z.boolean().default(false),
  displayName: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  linkedAt: z.string().nullable().optional(),
});

export type LinkedAuthProvider = z.infer<typeof linkedAuthProviderSchema>;

export const linkedAuthProvidersResponseSchema = z.object({
  items: z.array(linkedAuthProviderSchema),
});

export type LinkedAuthProvidersResponse = z.infer<typeof linkedAuthProvidersResponseSchema>;

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
  priceMinor: z.number().int().nonnegative().default(0),
  currency: currencyCodeSchema.default("RUB"),
  isActive: z.boolean().default(true),
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
  "Generate exactly one photorealistic image. The subject must be the exact same person from the provided reference photos, with maximum identity fidelity. Preserve facial structure, proportions, skin tone, eye distance, nose shape, lip shape, jawline, and overall likeness. Do not beautify into a different person, do not stylize the face, and do not introduce face drift.";

const IDENTITY_LOCK_PROMPT =
  "Identity lock: prioritize face consistency over styling. Keep the same age impression, facial proportions, ethnic features, and natural skin texture. Do not change gender presentation, do not invent new facial features, and do not substitute with a similar-looking model.";

const REALISM_GUARDRAILS_PROMPT =
  "Realism guardrails: realistic photography only, natural anatomy, correct hands, natural eyes, believable teeth, consistent lighting, coherent perspective, intact jewelry and fabric details, no duplicated limbs, no warped accessories, no plastic skin, no AI artifacts.";

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
  "First, internally expand this short request into a premium photography brief with environment, camera distance, lens feel, lighting direction, composition, styling, pose, mood, and color palette. Then generate the image. User request: ";

const FREE_MODE_PROMPT =
  "Free mode: follow the user's request faithfully, but turn it into a polished premium photo with believable lighting, strong composition, and a natural pose.";

const TEMPLATE_MODE_PROMPT =
  "Template mode: preserve the core scene design of the selected template, but render it as a believable premium photograph with clean identity matching and elegant composition.";

const REFERENCE_MODE_PROMPT =
  "Reference mode: recreate the scene logic from the reference image while replacing the person with the exact subject from the profile photos. Match composition, camera angle, mood, and styling cues, but do not copy the original person's face.";

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
  const partsMap = buildPartsMap(constructor);
  const maxChars = constructor?.shortPromptMaxChars ?? 80;
  const maxWords = constructor?.shortPromptMaxWords ?? 6;

  const base =
    partsMap?.get("base") ?? args.config?.basePrompt ?? DEFAULT_GENERATION_BASE_PROMPT;
  const identityLock = partsMap?.get("identity_lock") ?? IDENTITY_LOCK_PROMPT;
  const realismGuardrails =
    partsMap?.get("realism_guardrails") ?? REALISM_GUARDRAILS_PROMPT;
  const profileMeta = buildProfileMeta(args.profile, partsMap);
  const closedMouthRule = buildClosedMouthRule(args.profile, partsMap);
  const modeInstruction =
    args.input.mode === "template"
      ? (partsMap?.get("template_mode") ?? TEMPLATE_MODE_PROMPT)
      : (partsMap?.get("free_mode") ?? FREE_MODE_PROMPT);

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
    identityLock,
    realismGuardrails,
    profileMeta,
    closedMouthRule,
    modeInstruction,
    sceneRequest,
    enhancePortrait,
  ].filter(Boolean);

  return promptParts.join(" ");
}

const REFERENCE_SCENE_PREFIX =
  "Create a photorealistic image that matches this scene description as closely as possible. Preserve the exact subject identity from the profile references. ";

export function buildReferenceModePrompt(args: {
  sceneDescription: string;
  userComment?: string;
  profile: PhotoProfile;
  enhancePortrait: boolean;
  promptConstructor?: PromptConstructorConfig;
}) {
  const partsMap = buildPartsMap(args.promptConstructor);

  const base =
    partsMap?.get("base") ?? DEFAULT_GENERATION_BASE_PROMPT;
  const identityLock = partsMap?.get("identity_lock") ?? IDENTITY_LOCK_PROMPT;
  const realismGuardrails =
    partsMap?.get("realism_guardrails") ?? REALISM_GUARDRAILS_PROMPT;
  const profileMeta = buildProfileMeta(args.profile, partsMap);
  const closedMouthRule = buildClosedMouthRule(args.profile, partsMap);
  const referenceModeInstruction =
    partsMap?.get("reference_mode") ?? REFERENCE_MODE_PROMPT;
  const referencePrefix =
    partsMap?.get("reference_scene_prefix") ?? REFERENCE_SCENE_PREFIX;
  const scenePart = `${referencePrefix}Scene description: ${args.sceneDescription}.`;
  const userCommentPart = args.userComment?.trim()
    ? `Additional user refinement: ${args.userComment}.`
    : undefined;

  const enhancePortrait = args.enhancePortrait
    ? (partsMap?.get("enhance_portrait") ?? ENHANCE_PORTRAIT_PROMPT)
    : undefined;

  const promptParts = [
    base,
    identityLock,
    realismGuardrails,
    profileMeta,
    closedMouthRule,
    referenceModeInstruction,
    scenePart,
    userCommentPart,
    enhancePortrait,
  ].filter(Boolean);

  return promptParts.join(" ");
}

function buildPartsMap(promptConstructor?: PromptConstructorConfig) {
  return promptConstructor
    ? new Map(promptConstructor.parts.map((p) => [p.key, p.value]))
    : null;
}

function buildProfileMeta(
  profile: PhotoProfile,
  partsMap: Map<string, string> | null
) {
  const count = profile.shots.filter((shot) => shot.status !== "missing").length;
  const percent = profile.completionPercent;
  const profileMetaTemplate =
    partsMap?.get("profile_meta") ??
    `Reference photos cover {count} face angles. Profile completeness: {percent}%. Match the same face across all generated viewpoints.`;

  return profileMetaTemplate
    .replace(/\{count\}/g, String(count))
    .replace(/\{percent\}/g, String(percent));
}

function buildClosedMouthRule(
  profile: PhotoProfile,
  partsMap: Map<string, string> | null
) {
  const hasSmileShot = profile.shots.some(
    (shot) => shot.type === "front_smile" && shot.status !== "missing"
  );

  return !hasSmileShot
    ? (partsMap?.get("closed_mouth") ?? CLOSED_MOUTH_PROMPT)
    : undefined;
}

export const generationRecordSchema = z.object({
  id: z.string(),
  mode: generationModeSchema,
  status: generationStatusSchema,
  billingStatus: generationBillingStatusSchema.default("NONE"),
  priceMinor: z.number().int().nonnegative().default(0),
  currency: currencyCodeSchema.default("RUB"),
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

export const billingAccountSchema = z.object({
  balanceMinor: z.number().int(),
  reservedMinor: z.number().int(),
  availableMinor: z.number().int(),
  currency: currencyCodeSchema,
});

export type BillingAccount = z.infer<typeof billingAccountSchema>;

export const generationQuoteSchema = z.object({
  pricingType: generationPricingTypeSchema,
  amountMinor: z.number().int().nonnegative(),
  currency: currencyCodeSchema,
  billingEnabled: z.boolean(),
  description: z.string(),
});

export type GenerationQuote = z.infer<typeof generationQuoteSchema>;

export const billingPricingSchema = z.object({
  billingEnabled: z.boolean(),
  textGenerationPriceMinor: z.number().int().nonnegative(),
  photoGenerationPriceMinor: z.number().int().nonnegative(),
  currency: currencyCodeSchema,
});

export type BillingPricing = z.infer<typeof billingPricingSchema>;

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
    priceMinor: 12900,
    currency: "RUB",
    isActive: true,
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
    priceMinor: 11900,
    currency: "RUB",
    isActive: true,
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
    priceMinor: 15900,
    currency: "RUB",
    isActive: true,
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
    billingStatus: "RESERVED",
    priceMinor: 11900,
    currency: "RUB",
    title: "Holiday Hero",
    subtitle: "Готовим кадры",
    createdAt: "2026-03-10T12:00:00.000Z",
  },
  {
    id: "gen-processing",
    mode: "free",
    status: "processing",
    billingStatus: "CAPTURED",
    priceMinor: 9900,
    currency: "RUB",
    title: "Tokyo rooftop at night",
    subtitle: "Генерируем",
    createdAt: "2026-03-10T11:45:00.000Z",
  },
  {
    id: "gen-completed",
    mode: "template",
    status: "completed",
    billingStatus: "CAPTURED",
    priceMinor: 12900,
    currency: "RUB",
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
  authProviders: "/api/v1/auth/providers/me",
} as const;
