"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { PhotoProfile, ShotType } from "@superava/shared";
import { uploadProfileShot } from "@/lib/api";
import { shotLabels } from "@/lib/ui-text";

export function ProfileShotUploader(props: {
  profile: PhotoProfile;
  selectedShot: ShotType | null;
  onClose: () => void;
}) {
  const { onClose, profile, selectedShot } = props;
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeShot, setActiveShot] = useState<ShotType | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const selectedShotRecord = useMemo(
    () =>
      selectedShot
        ? profile.shots.find((shot) => shot.type === selectedShot) ?? null
        : null,
    [profile.shots, selectedShot]
  );

  useEffect(() => {
    setMessage(null);
  }, [selectedShot]);

  useEffect(() => {
    if (!selectedShot) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPending, onClose, selectedShot]);

  function openCamera() {
    setMessage(null);
    cameraInputRef.current?.click();
  }

  function openFilePicker() {
    setMessage(null);
    fileInputRef.current?.click();
  }

  async function uploadShot(shotType: ShotType, file: File) {
    setActiveShot(shotType);
    setMessage(null);

    startTransition(async () => {
      try {
        await uploadProfileShot(shotType, file);
        router.refresh();
        onClose();
      } catch (error) {
        setMessage(normalizeUploadError(error));
      } finally {
        setActiveShot(null);
      }
    });
  }

  function handleFileChange(shotType: ShotType, file: File | null) {
    if (!file) {
      return;
    }

    void uploadShot(shotType, file);
  }

  function getShotPreviewSrc(shot: PhotoProfile["shots"][number]) {
    if (!shot.previewUrl) {
      return `/api/shot-reference/${shot.type}?size=220`;
    }

    const version = shot.previewVersion
      ? `?v=${encodeURIComponent(shot.previewVersion)}`
      : "";
    return `${shot.previewUrl}${version}`;
  }

  if (!selectedShot || !selectedShotRecord || typeof document === "undefined") {
    return null;
  }

  const busy = isPending && activeShot === selectedShot;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/82 p-3 sm:items-center sm:p-4"
      onClick={() => {
        if (!isPending) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Загрузка ракурса ${shotLabels[selectedShot]}`}
    >
      <div
        className="relative flex max-h-[calc(100vh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#171126] shadow-[0_30px_120px_rgba(15,23,42,0.5)] sm:max-h-[calc(100vh-2rem)] sm:rounded-[2rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
              Ракурс профиля
            </p>
            <h3 className="mt-1 truncate text-lg font-semibold text-white sm:text-xl">
              {shotLabels[selectedShot]}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/8 disabled:opacity-60"
          >
            Закрыть
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {message ? (
            <div className="mb-4 rounded-[1.2rem] border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm leading-6 text-cyan-100">
              {message}
            </div>
          ) : null}

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            disabled={busy}
            onChange={(event) => {
              handleFileChange(selectedShot, event.currentTarget.files?.[0] ?? null);
              event.currentTarget.value = "";
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(event) => {
              handleFileChange(selectedShot, event.currentTarget.files?.[0] ?? null);
              event.currentTarget.value = "";
            }}
          />

          <div className="space-y-4">
            <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-900/60">
              <Image
                src={getShotPreviewSrc(selectedShotRecord)}
                alt={shotLabels[selectedShot]}
                width={480}
                height={480}
                unoptimized
                className={`aspect-square w-full object-cover ${
                  selectedShotRecord.status === "missing" ? "opacity-60" : "opacity-100"
                }`}
              />
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={openCamera}
                disabled={busy}
                className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-70"
              >
                Камера
              </button>
              <button
                type="button"
                onClick={openFilePicker}
                disabled={busy}
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/6 disabled:opacity-70"
              >
                Файл
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function normalizeUploadError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Не удалось загрузить фото.";
  }

  if (error.message === "upload_failed") {
    return "Не удалось загрузить файл. Попробуйте другой снимок или повторите позже.";
  }

  if (error.message.includes("image")) {
    return "Нужна фотография лица в хорошем качестве без сильных искажений.";
  }

  return error.message;
}
