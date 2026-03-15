"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import type { GenerationRecord } from "@superava/shared";
import {
  BROWSER_GENERATIONS_UPDATED_EVENT,
  listBrowserGenerations,
  type BrowserGenerationRecord,
} from "@/lib/browser-generations";
import { generationStatusDescriptions, statusLabels } from "@/lib/ui-text";

export function GenerationGallery(props: {
  generations: GenerationRecord[];
  maxItems?: number;
  emptyText?: string;
}) {
  const router = useRouter();
  const [browserGenerations, setBrowserGenerations] = useState<BrowserGenerationRecord[]>([]);
  const [modalImage, setModalImage] = useState<{ src: string; alt: string } | null>(null);

  const items = useMemo(() => {
    const combined = [...browserGenerations, ...props.generations];
    const sorted = combined.sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
    return typeof props.maxItems === "number" ? sorted.slice(0, props.maxItems) : sorted;
  }, [browserGenerations, props.generations, props.maxItems]);

  const hasActiveGenerations = items.some((g) =>
    ["queued", "processing", "finalizing"].includes(g.status)
  );

  useEffect(() => {
    const sync = () => setBrowserGenerations(listBrowserGenerations());
    sync();
    window.addEventListener(BROWSER_GENERATIONS_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(BROWSER_GENERATIONS_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!hasActiveGenerations) return;
    const id = window.setInterval(() => router.refresh(), 4000);
    return () => window.clearInterval(id);
  }, [hasActiveGenerations, router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalImage(null);
    };
    if (modalImage) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handler);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [modalImage]);

  const handleDownload = useCallback((url: string, filename: string) => {
    if (url.startsWith("data:")) {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "superava.png";
      a.click();
      return;
    }
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename || "superava.png";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => window.open(url, "_blank"));
  }, []);

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-8 text-center text-sm text-slate-400">
        {props.emptyText ?? "Пока нет генераций."}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map((generation) => {
          const imageSrc =
            "imageDataUrl" in generation && typeof generation.imageDataUrl === "string"
              ? generation.imageDataUrl
              : generation.previewUrl
                ? generation.previewUrl
                : null;

          return (
            <div
              key={generation.id}
              className="group relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-slate-950/50 transition hover:border-fuchsia-400/30"
            >
              {imageSrc ? (
                <button
                  type="button"
                  onClick={() =>
                    setModalImage({
                      src: imageSrc.startsWith("data:") ? imageSrc : `${window.location.origin}${imageSrc}`,
                      alt: generation.title,
                    })
                  }
                  className="block w-full"
                >
                  <Image
                    src={imageSrc}
                    alt={generation.title}
                    width={320}
                    height={320}
                    unoptimized
                    className="aspect-square w-full object-cover transition group-hover:scale-105"
                  />
                </button>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-white/5 px-4 text-center text-xs uppercase tracking-widest text-slate-500">
                  {generation.status === "failed" ? "Ошибка генерации" : "Идет обработка"}
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950 to-transparent" />
              <div className="absolute inset-x-3 bottom-3">
                <p className="truncate text-sm font-semibold text-white">{generation.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-300">
                  {generation.status === "completed"
                    ? generation.subtitle
                    : generationStatusDescriptions[generation.status]}
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  {statusLabels[generation.status]}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {modalImage &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setModalImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Просмотр изображения"
          >
            <div
              className="relative max-h-[90vh] max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={modalImage.src}
                alt={modalImage.alt}
                className="max-h-[85vh] w-auto rounded-2xl object-contain shadow-2xl"
                draggable={false}
              />
              <div className="mt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleDownload(modalImage.src, "superava.png")}
                  className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
                >
                  <DownloadIcon />
                  Скачать
                </button>
                <button
                  type="button"
                  onClick={() => setModalImage(null)}
                  className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
