import type { GenerationStatus, ShotType } from "@superava/shared";

export const shotLabels: Record<ShotType, string> = {
  front_neutral: "Анфас",
  front_smile: "Анфас с улыбкой",
  left_45: "Левый 45°",
  right_45: "Правый 45°",
  left_profile: "Левый профиль",
  right_profile: "Правый профиль",
};

export const shotShortLabels: Record<ShotType, string> = {
  front_neutral: "А",
  front_smile: "У",
  left_45: "Л45",
  right_45: "П45",
  left_profile: "ЛП",
  right_profile: "ПП",
};

export const shotAngleLabels: Record<ShotType, string> = {
  front_neutral: "ровно",
  front_smile: "ровно",
  left_45: "3/4 влево",
  right_45: "3/4 вправо",
  left_profile: "левый бок",
  right_profile: "правый бок",
};

export const statusLabels: Record<GenerationStatus, string> = {
  queued: "в очереди",
  processing: "генерация",
  finalizing: "сборка",
  completed: "готово",
  failed: "ошибка",
};

export const templateTextBySlug: Record<string, { subtitle: string; description: string }> = {
  "vip-portrait": {
    subtitle: "Премиальный портрет",
    description: "Студийный свет, чистый кадр.",
  },
  "holiday-hero": {
    subtitle: "Праздничный кадр",
    description: "Яркая сцена для открытки или поста.",
  },
};

export const holidayCategoryCards = [
  {
    title: "8 марта",
    subtitle: "Нежный свет, цветы и мягкий праздничный портрет.",
    badge: "Весна",
  },
  {
    title: "Новый год",
    subtitle: "Огни, блеск, вечерний снег и атмосферные кадры.",
    badge: "Праздник",
  },
  {
    title: "День рождения",
    subtitle: "Торжественный образ, торт, свечи и тёплая эмоция.",
    badge: "Событие",
  },
  {
    title: "День победы",
    subtitle: "Парадный стиль, уличный свет и историческое настроение.",
    badge: "Память",
  },
  {
    title: "23 февраля",
    subtitle: "Сдержанный характер, формальный кадр и сильная подача.",
    badge: "Характер",
  },
  {
    title: "Хэллоуин",
    subtitle: "Тёмная сцена, неон, дым и яркий тематический образ.",
    badge: "Mood",
  },
] as const;

export const shotStatusLabels = {
  missing: "нужно фото",
  uploaded: "загружено",
  approved: "готово",
  uploading: "загрузка",
} as const;
