"use client";

import { useMemo, useState } from "react";
import type { PhotoProfile, ShotType } from "@superava/shared";
import { ProfileProgressLine } from "@/components/profile-progress-line";
import { ProfileShotUploader } from "@/components/profile-shot-uploader";
import { shotGuidanceText, shotLabels } from "@/lib/ui-text";

export function HomeProfileSection(props: {
  profile: PhotoProfile;
  notice?: string | null;
}) {
  const [selectedShot, setSelectedShot] = useState<ShotType | null>(null);

  const nextMissingShot = useMemo(
    () => props.profile.shots.find((shot) => shot.status === "missing")?.type ?? null,
    [props.profile.shots]
  );

  const highlightedShot = selectedShot ?? nextMissingShot ?? null;

  return (
    <div className="space-y-4">
      {props.notice ? (
        <div className="rounded-[1.5rem] border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          {props.notice}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-slate-950/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-white">
            Нажмите на любой ракурс, чтобы сразу добавить фото с камеры или из галереи.
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Больше не нужно переходить на отдельный экран: профиль собирается прямо здесь, на
            главной странице.
          </p>
          {highlightedShot ? (
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-300">
              Сейчас удобнее всего добавить: {shotLabels[highlightedShot]}
            </p>
          ) : null}
        </div>
        <div className="shrink-0">
          <button
            type="button"
            onClick={() =>
              setSelectedShot(nextMissingShot ?? props.profile.shots[0]?.type ?? null)
            }
            className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            {nextMissingShot ? `Добавить ${shotLabels[nextMissingShot]}` : "Обновить любой ракурс"}
          </button>
        </div>
      </div>

      <ProfileProgressLine
        profile={props.profile}
        interactive
        activeShot={highlightedShot}
        onSelectShot={setSelectedShot}
      />

      {highlightedShot ? (
        <div className="rounded-[1.5rem] border border-cyan-400/15 bg-cyan-400/8 px-4 py-3 text-sm text-slate-300">
          <span className="font-semibold text-white">{shotLabels[highlightedShot]}:</span>{" "}
          {shotGuidanceText[highlightedShot]}
        </div>
      ) : null}

      <ProfileShotUploader
        profile={props.profile}
        selectedShot={selectedShot}
        onClose={() => setSelectedShot(null)}
      />
    </div>
  );
}
