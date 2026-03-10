import type { ShotType } from "@superava/shared";
import { prisma } from "../db.js";
import { putObject } from "../storage.js";
import { profileShotKey } from "../storage.js";
import { processProfileShot, validateImage } from "../image-pipeline.js";

const SHOT_TYPES: ShotType[] = [
  "front_neutral",
  "front_smile",
  "left_45",
  "right_45",
  "left_profile",
  "right_profile",
];

export async function getOrCreateDevUser() {
  let user = await prisma.user.findFirst({
    where: { email: "dev@superava.local" },
    include: { profiles: { include: { shots: true } } },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "dev@superava.local",
        name: "Dev User",
      },
      include: { profiles: { include: { shots: true } } },
    });
  }
  return user;
}

export async function getOrCreateProfile(userId: string) {
  let profile = await prisma.photoProfile.findFirst({
    where: { userId },
    include: { shots: true },
  });
  if (!profile) {
    profile = await prisma.photoProfile.create({
      data: {
        userId,
        displayName: "User",
      },
      include: { shots: true },
    });
  }
  return profile;
}

export async function uploadProfileShot(
  profileId: string,
  shotType: ShotType,
  buffer: Buffer
): Promise<{ ok: boolean; error?: string }> {
  const validation = await validateImage(buffer);
  if (!validation.ok) {
    return validation;
  }

  const { canonical, preview } = await processProfileShot(buffer);

  const canonicalKey = profileShotKey(profileId, shotType, "canonical");
  const previewKey = profileShotKey(profileId, shotType, "preview");

  await putObject(canonicalKey, canonical, "image/jpeg");
  await putObject(previewKey, preview, "image/jpeg");

  await prisma.profileShot.upsert({
    where: {
      profileId_shotType: { profileId, shotType },
    },
    create: {
      profileId,
      shotType,
      storageKey: canonicalKey,
      previewKey,
      status: "uploaded",
    },
    update: {
      storageKey: canonicalKey,
      previewKey,
      status: "uploaded",
    },
  });

  return { ok: true };
}

export function toApiProfile(profile: {
  id: string;
  displayName: string;
  shots: {
    shotType: string;
    status: string;
    previewKey?: string | null;
    updatedAt?: Date;
  }[];
}) {
  const shotMap = new Map(profile.shots.map((s) => [s.shotType, s]));
  const shots = SHOT_TYPES.map((type) => {
    const s = shotMap.get(type);
    return {
      id: `shot-${type}`,
      type,
      status: (s?.status ?? "missing") as "missing" | "uploaded" | "approved",
      guidance: getGuidance(type),
      exampleAngle: getExampleAngle(type),
      previewUrl: s?.previewKey ? `/api/v1/profile/shots/${type}/preview` : undefined,
      previewVersion: s?.updatedAt?.toISOString(),
    };
  });
  const uploaded = shots.filter((s) => s.status !== "missing").length;
  const completionPercent = Math.round((uploaded / SHOT_TYPES.length) * 100);

  return {
    id: profile.id,
    displayName: profile.displayName,
    completionPercent,
    shots,
  };
}

function getGuidance(type: ShotType): string {
  const map: Record<ShotType, string> = {
    front_neutral: "Смотрите прямо, лицо ровно.",
    front_smile: "Тот же ракурс, легкая улыбка.",
    left_45: "Повернитесь немного влево.",
    right_45: "Повернитесь немного вправо.",
    left_profile: "Полный левый профиль.",
    right_profile: "Полный правый профиль.",
  };
  return map[type];
}

function getExampleAngle(type: ShotType): string {
  const map: Record<ShotType, string> = {
    front_neutral: "ровно",
    front_smile: "ровно",
    left_45: "3/4 влево",
    right_45: "3/4 вправо",
    left_profile: "левый бок",
    right_profile: "правый бок",
  };
  return map[type];
}
