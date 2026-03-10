"use client";

import Image from "next/image";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import type { GenerationRecord } from "@superava/shared";
import { StatusPill } from "@superava/ui";
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
  const items = useMemo(
    () =>
      typeof props.maxItems === "number"
        ? props.generations.slice(0, props.maxItems)
        : props.generations,
    [props.generations, props.maxItems]
  );
  const hasActiveGenerations = items.some((generation) =>
    ["queued", "processing", "finalizing"].includes(generation.status)
  );

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
        const imageSize = props.compact ? 96 : 144;

        return (
          <div
            key={generation.id}
            className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55"
          >
            <div className="flex flex-col gap-4 p-4 sm:flex-row">
              <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-900/80">
                {generation.previewUrl ? (
                  <Image
                    src={`/api/generation-preview/${generation.id}`}
                    alt={generation.title}
                    width={imageSize}
                    height={imageSize}
                    unoptimized
                    className={`object-cover ${
                      props.compact ? "h-24 w-24" : "h-36 w-full sm:w-36"
                    }`}
                  />
                ) : (
                  <div
                    className={`flex items-center justify-center bg-white/5 text-xs uppercase tracking-[0.22em] text-slate-500 ${
                      props.compact ? "h-24 w-24" : "h-36 w-full sm:w-36"
                    }`}
                  >
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

                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
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
