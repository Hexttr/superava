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
});

export type PromptTemplate = z.infer<typeof promptTemplateSchema>;

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
  },
  {
    id: "template-holiday-hero",
    slug: "holiday-hero",
    title: "Holiday Hero",
    subtitle: "Праздничный кадр",
    group: "holiday",
    previewLabel: "Holiday",
    description: "Праздничная сцена с аккуратной посадкой лица.",
  },
];

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
} as const;
