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
  prompt: "/images/direction-prompt.png",
  gallery: "/images/direction-gallery.png",
  reference: "/images/direction-reference.png",
};

export function HomeDirectionCards(props: {
  profile: PhotoProfile;
  templates: PromptTemplate[];
  generationPromptConfig: GenerationPromptConfig;
  promptConstructor?: PromptConstructorConfig;
}) {
  const [selected, setSelected] = useState<Direction>(null);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setSelected(selected === "prompt" ? null : "prompt")}
          className={`group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 text-left transition hover:border-fuchsia-400/40 hover:shadow-lg hover:shadow-fuchsia-500/10 ${
            selected === "prompt" ? "ring-2 ring-fuchsia-400/50" : ""
          }`}
        >
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src={DIRECTION_IMAGES.prompt}
              alt=""
              fill
              className="object-cover transition group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-between p-5">
              <span className="text-xs font-medium uppercase tracking-widest text-white/80">
                Ваш промпт
              </span>
              <p className="text-lg font-semibold text-white drop-shadow-lg">
                Опишите сцену словами — мы создадим кадр
              </p>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-slate-400">
              Текстовое описание → генерация с вашим лицом
            </p>
          </div>
        </button>

        <Link
          href="/templates"
          className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 text-left transition hover:border-violet-400/40 hover:shadow-lg hover:shadow-violet-500/10"
        >
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src={DIRECTION_IMAGES.gallery}
              alt=""
              fill
              className="object-cover transition group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-between p-5">
              <span className="text-xs font-medium uppercase tracking-widest text-white/80">
                Галерея промптов
              </span>
              <p className="text-lg font-semibold text-white drop-shadow-lg">
                Готовые сцены — один клик
              </p>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-slate-400">
              Шаблоны праздников, портретов и сцен
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setSelected(selected === "reference" ? null : "reference")}
          className={`group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 text-left transition hover:border-rose-400/40 hover:shadow-lg hover:shadow-rose-500/10 ${
            selected === "reference" ? "ring-2 ring-rose-400/50" : ""
          }`}
        >
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src={DIRECTION_IMAGES.reference}
              alt=""
              fill
              className="object-cover transition group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-between p-5">
              <span className="text-xs font-medium uppercase tracking-widest text-white/80">
                Композиция из фото
              </span>
              <p className="text-lg font-semibold text-white drop-shadow-lg">
                Загрузите кадр — вставим вас в сцену
              </p>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-slate-400">
              Анализ сцены → замена лица на ваше
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
