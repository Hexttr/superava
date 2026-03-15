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
              className="object-cover object-top transition group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-slate-950/20" />
            <div className="absolute inset-0 flex flex-col justify-between p-5">
              <span className="inline-flex w-fit rounded-full border border-fuchsia-400/30 bg-fuchsia-500/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-fuchsia-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                Ваш промпт
              </span>
              <p className="text-lg font-semibold text-fuchsia-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                Опишите сцену своими словами — получите красивый кадр
              </p>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-slate-400">
              Текстовое описание — генерация с вашим лицом
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
              className="object-cover object-top transition group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-slate-950/20" />
            <div className="absolute inset-0 flex flex-col justify-between p-5">
              <span className="inline-flex w-fit rounded-full border border-fuchsia-400/30 bg-fuchsia-500/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-fuchsia-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                Галерея промптов
              </span>
              <p className="text-lg font-semibold text-fuchsia-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                Выберите сцену и мы идеально впишем вас в неё!
              </p>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-slate-400">
              Шаблоны праздников и просто невероятные снимки с вами!
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
              className="object-cover object-top transition group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-slate-950/20" />
            <div className="absolute inset-0 flex flex-col justify-between p-5">
              <span className="inline-flex w-fit rounded-full border border-fuchsia-400/30 bg-fuchsia-500/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-fuchsia-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                Композиция из фото
              </span>
              <p className="text-lg font-semibold text-fuchsia-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                Загрузите свой кадр и на нём окажетесь вы
              </p>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-slate-400">
              Проанализируем сцену и впишем вас в похожее окружение
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
