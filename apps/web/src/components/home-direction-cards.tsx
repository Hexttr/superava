"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { GenerationComposer } from "@/components/generation-composer";
import type {
  GenerationPromptConfig,
  PhotoProfile,
  PromptConstructorConfig,
  PromptTemplate,
} from "@superava/shared";

type Direction = "prompt" | "gallery" | "reference" | null;

const DIRECTION_IMAGES = {
  prompt: "/images/direction-prompt.webp",
  gallery: "/images/direction-gallery.webp",
  reference: "/images/direction-reference.webp",
};

export function HomeDirectionCards(props: {
  profile: PhotoProfile;
  templates: PromptTemplate[];
  generationPromptConfig: GenerationPromptConfig;
  promptConstructor?: PromptConstructorConfig;
}) {
  const [selected, setSelected] = useState<Direction>(null);
  const readyShots = props.profile.shots.filter((shot) => shot.status !== "missing").length;
  const profileReady = props.profile.completionPercent >= 100;

  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/50 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">
              {profileReady
                ? "Профиль готов. Можно запускать любые сценарии."
                : "Сначала соберите профиль, затем запускайте лучшие сцены."}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Сейчас у вас {readyShots} из 6 ракурсов. Чем ближе профиль к 100%, тем стабильнее
              лицо и свет в финальном кадре.
            </p>
          </div>
          <div className="shrink-0 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-200">
            {props.profile.completionPercent}% профиля
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setSelected(selected === "prompt" ? null : "prompt")}
          className={`group overflow-hidden rounded-[1.8rem] border border-white/10 bg-slate-950/60 text-left transition hover:border-fuchsia-400/40 hover:shadow-lg hover:shadow-fuchsia-500/10 ${
            selected === "prompt" ? "ring-2 ring-fuchsia-400/50" : ""
          }`}
        >
          <div className="relative aspect-square overflow-hidden bg-slate-900">
            <Image
              src={DIRECTION_IMAGES.prompt}
              alt=""
              fill
              className="object-contain object-top"
              sizes="(max-width: 640px) 100vw, 33vw"
              style={{ objectFit: "contain", objectPosition: "top" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-slate-950/20" />
            <div className="absolute inset-0 flex flex-col justify-between p-5">
              <span className="inline-flex w-fit rounded-full border border-fuchsia-400/30 bg-fuchsia-500/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-fuchsia-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                Сценарий 1
              </span>
              <p className="text-lg font-semibold text-fuchsia-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                Опишите сцену своими словами и получите персональный кадр
              </p>
            </div>
          </div>
          <div className="space-y-2 p-4">
            <p className="text-sm text-slate-400">
              Лучший вариант для уникальных идей, mood-кадров и быстрых экспериментов.
            </p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Текстовый запрос
            </p>
          </div>
        </button>

        <Link
          href="/templates"
          className="group overflow-hidden rounded-[1.8rem] border border-white/10 bg-slate-950/60 text-left transition hover:border-violet-400/40 hover:shadow-lg hover:shadow-violet-500/10"
        >
          <div className="relative aspect-square overflow-hidden bg-slate-900">
            <Image
              src={DIRECTION_IMAGES.gallery}
              alt=""
              fill
              className="object-contain object-top"
              sizes="(max-width: 640px) 100vw, 33vw"
              style={{ objectFit: "contain", objectPosition: "top" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-slate-950/20" />
            <div className="absolute inset-0 flex flex-col justify-between p-5">
              <span className="inline-flex w-fit rounded-full border border-fuchsia-400/30 bg-fuchsia-500/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-fuchsia-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                Сценарий 2
              </span>
              <p className="text-lg font-semibold text-fuchsia-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                Выберите готовую сцену и получите более предсказуемый результат
              </p>
            </div>
          </div>
          <div className="space-y-2 p-4">
            <p className="text-sm text-slate-400">
              Подходит для праздников, lifestyle-сюжетов и быстрого старта без формулировки промпта.
            </p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Галерея шаблонов
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setSelected(selected === "reference" ? null : "reference")}
          className={`group overflow-hidden rounded-[1.8rem] border border-white/10 bg-slate-950/60 text-left transition hover:border-rose-400/40 hover:shadow-lg hover:shadow-rose-500/10 ${
            selected === "reference" ? "ring-2 ring-rose-400/50" : ""
          }`}
        >
          <div className="relative aspect-square overflow-hidden bg-slate-900">
            <Image
              src={DIRECTION_IMAGES.reference}
              alt=""
              fill
              className="object-contain object-top"
              sizes="(max-width: 640px) 100vw, 33vw"
              style={{ objectFit: "contain", objectPosition: "top" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-slate-950/20" />
            <div className="absolute inset-0 flex flex-col justify-between p-5">
              <span className="inline-flex w-fit rounded-full border border-fuchsia-400/30 bg-fuchsia-500/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-fuchsia-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                Сценарий 3
              </span>
              <p className="text-lg font-semibold text-fuchsia-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                Загрузите референс-кадр и перенесите себя в его композицию
              </p>
            </div>
          </div>
          <div className="space-y-2 p-4">
            <p className="text-sm text-slate-400">
              Идеально, когда вам нравится конкретная сцена, поза или настроение на чужом фото.
            </p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Фото-референс
            </p>
          </div>
        </button>
      </div>

      {selected === "prompt" && (
        <div
          id="form-prompt"
          className="rounded-2xl border border-fuchsia-400/20 bg-slate-950/60 p-5"
        >
          <GenerationComposer
            {...props}
            mode="prompt"
            showTemplates={false}
          />
        </div>
      )}

      {selected === "reference" && (
        <div
          id="form-reference"
          className="rounded-2xl border border-rose-400/20 bg-slate-950/60 p-5"
        >
          <GenerationComposer
            {...props}
            mode="reference"
            showTemplates={false}
          />
        </div>
      )}
    </div>
  );
}
