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
  prompt: "/images/scene-text-card.png",
  gallery: "/images/scene-template-card.png",
  reference: "/images/scene-custom-card.png",
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
      {selected === null ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <DirectionCard
            title="Опишите сцену словами"
            imageSrc={DIRECTION_IMAGES.prompt}
            onClick={() => setSelected("prompt")}
          />
          <Link
            href="/templates"
            className="group overflow-hidden rounded-[1.8rem] border border-white/10 bg-slate-950/60 text-left transition hover:-translate-y-0.5 hover:border-violet-300/40 hover:shadow-[0_20px_60px_rgba(76,29,149,0.18)]"
          >
            <DirectionCardBody
              title="Выберите готовую сцену"
              imageSrc={DIRECTION_IMAGES.gallery}
            />
          </Link>
          <DirectionCard
            title="Предложите свою сцену"
            imageSrc={DIRECTION_IMAGES.reference}
            onClick={() => setSelected("reference")}
          />
        </div>
      ) : null}

      {selected === "prompt" && (
        <div id="form-prompt" className="rounded-[2rem] border border-fuchsia-400/15 bg-slate-950/60 p-4 sm:p-5">
          <GenerationComposer
            {...props}
            mode="prompt"
            showTemplates={false}
            onBack={() => setSelected(null)}
          />
        </div>
      )}

      {selected === "reference" && (
        <div id="form-reference" className="rounded-[2rem] border border-rose-400/15 bg-slate-950/60 p-4 sm:p-5">
          <GenerationComposer
            {...props}
            mode="reference"
            showTemplates={false}
            onBack={() => setSelected(null)}
          />
        </div>
      )}
    </div>
  );
}

function DirectionCard(props: { title: string; imageSrc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="group overflow-hidden rounded-[1.8rem] border border-white/10 bg-slate-950/60 text-left transition hover:-translate-y-0.5 hover:border-fuchsia-300/40 hover:shadow-[0_20px_60px_rgba(168,85,247,0.16)]"
    >
      <DirectionCardBody title={props.title} imageSrc={props.imageSrc} />
    </button>
  );
}

function DirectionCardBody(props: { title: string; imageSrc: string }) {
  return (
    <>
      <div className="relative aspect-square overflow-hidden bg-[radial-gradient(circle_at_top,#2e1065,transparent_58%),linear-gradient(180deg,#120b25_0%,#09090f_100%)]">
        <Image
          src={props.imageSrc}
          alt=""
          fill
          className="object-cover transition duration-300 group-hover:scale-[1.02]"
          sizes="(max-width: 640px) 100vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/16 to-transparent" />
      </div>
      <div className="px-4 pb-5 pt-4 sm:px-5">
        <p className="text-base font-semibold leading-6 text-white sm:text-lg">{props.title}</p>
      </div>
    </>
  );
}
