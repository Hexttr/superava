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

export const shotGuidanceText: Record<ShotType, string> = {
  front_neutral: "Смотрите прямо в камеру, лицо ровно, подбородок без наклона.",
  front_smile: "Тот же ракурс, но с легкой естественной улыбкой и расслабленным взглядом.",
  left_45: "Повернитесь влево примерно на 45 градусов, оба глаза должны быть видны.",
  right_45: "Повернитесь вправо примерно на 45 градусов, сохраните мягкий свет на лице.",
  left_profile: "Полный левый профиль: нос и линия подбородка читаются четко на контрастном фоне.",
  right_profile: "Полный правый профиль: держите голову ровно и не уводите взгляд вниз.",
};

export const shotCaptureTips = [
  "Снимайте при мягком дневном или ровном комнатном свете без жёстких теней.",
  "В кадре должен быть только один человек, без очков, масок и сильных фильтров.",
  "Не меняйте прическу, макияж и свет между ракурсами, чтобы лицо сохранялось стабильнее.",
] as const;

export const statusLabels: Record<GenerationStatus, string> = {
  queued: "в очереди",
  processing: "генерация",
  finalizing: "сборка",
  completed: "готово",
  failed: "ошибка",
};

export const generationStatusDescriptions: Record<GenerationStatus, string> = {
  queued: "Запрос принят. Скоро воркер начнет собирать сцену.",
  processing: "Собираем композицию, свет и сходство лица по профилю.",
  finalizing: "Кадр уже собран. Завершаем сохранение и подготовку превью.",
  completed: "Результат готов и доступен для просмотра и скачивания.",
  failed: "Что-то пошло не так. Можно скорректировать запрос и попробовать снова.",
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
  "birthday-rooftop-sunset": {
    subtitle: "День рождения на rooftop-террасе",
    description: "Закатный luxury-ужин на крыше с бокалом шампанского и журнальной подачей.",
  },
};

export const holidayCategoryCards: ReadonlyArray<{
  title: string;
  subtitle: string;
  badge: string;
  href?: string;
}> = [
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
    subtitle: "Закатная rooftop-сцена с luxury-настроением, шампанским и персональным fashion-кадром.",
    badge: "Событие",
    href: "/templates#birthday-rooftop-sunset",
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

export function formatShotStep(index: number, total: number) {
  return `Шаг ${index + 1} из ${total}`;
}
