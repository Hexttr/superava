"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { GenerationRecord } from "@superava/shared";
import { StatusPill } from "@superava/ui";
import {
  BROWSER_GENERATIONS_UPDATED_EVENT,
  listBrowserGenerations,
  type BrowserGenerationRecord,
} from "@/lib/browser-generations";
import { statusLabels } from "@/lib/ui-text";

const toneByStatus = {
  queued: "warning",
  processing: "accent",
  finalizing: "accent",
  completed: "success",
  failed: "warning",
} as const;

export function GenerationFeed(props: {
  generations: GenerationRecord[];
  maxItems?: number;
  compact?: boolean;
  emptyText?: string;
}) {
  const router = useRouter();
  const [browserGenerations, setBrowserGenerations] = useState<BrowserGenerationRecord[]>([]);
  const items = useMemo(() => {
    const combined = [...browserGenerations, ...props.generations].filter(
      (g) => g.status !== "failed"
    );
    const sorted = combined.sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
    return typeof props.maxItems === "number" ? sorted.slice(0, props.maxItems) : sorted;
  }, [browserGenerations, props.generations, props.maxItems]);
  const hasActiveGenerations = items.some((generation) =>
    ["queued", "processing", "finalizing"].includes(generation.status)
  );

  useEffect(() => {
    const sync = () => {
      setBrowserGenerations(listBrowserGenerations());
    };

    sync();
    window.addEventListener(BROWSER_GENERATIONS_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(BROWSER_GENERATIONS_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!hasActiveGenerations) {
      return;
    }

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 4000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasActiveGenerations, router]);

  if (!items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
        {props.emptyText ?? "Пока нет генераций."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((generation) => {
        const imageSrc =
          "imageDataUrl" in generation && typeof generation.imageDataUrl === "string"
            ? generation.imageDataUrl
            : generation.previewUrl
              ? generation.previewUrl
              : null;

        if (props.compact) {
          return (
            <div
              key={generation.id}
              className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/65"
            >
              <div className="relative">
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt={generation.title}
                    width={640}
                    height={640}
                    unoptimized
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-white/5 text-xs uppercase tracking-[0.22em] text-slate-500">
                    {generation.status === "failed" ? "Ошибка" : "Ждем"}
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950 to-transparent" />
                <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
                  <StatusPill
                    label={statusLabels[generation.status]}
                    tone={toneByStatus[generation.status]}
                  />
                  {"source" in generation ? (
                    <StatusPill label="browser" tone="neutral" />
                  ) : null}
                </div>
                <div className="absolute inset-x-4 bottom-4">
                  <p className="truncate text-base font-semibold text-white">{generation.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-300">
                    {generation.subtitle}
                  </p>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    {new Date(generation.createdAt).toLocaleString("ru-RU")}
                  </p>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div
            key={generation.id}
            className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55"
          >
            <div className="flex flex-col gap-4 p-4 sm:flex-row">
              <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-900/80">
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt={generation.title}
                    width={144}
                    height={144}
                    unoptimized
                    className="h-36 w-full object-cover sm:w-36"
                  />
                ) : (
                  <div className="flex h-36 w-full items-center justify-center bg-white/5 text-xs uppercase tracking-[0.22em] text-slate-500 sm:w-36">
                    {generation.status === "failed" ? "Ошибка" : "Ждем"}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-white sm:text-lg">
                      {generation.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {generation.subtitle}
                    </p>
                  </div>
                  <StatusPill
                    label={statusLabels[generation.status]}
                    tone={toneByStatus[generation.status]}
                  />
                </div>

                {"source" in generation ? (
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-cyan-300">
                    Локальный browser-тест
                  </p>
                ) : null}
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                  {new Date(generation.createdAt).toLocaleString("ru-RU")}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
