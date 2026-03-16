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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeShot, setActiveShot] = useState<ShotType | null>(null);
  const [cameraShot, setCameraShot] = useState<ShotType | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const selectedShotRecord = useMemo(
    () =>
      selectedShot
        ? profile.shots.find((shot) => shot.type === selectedShot) ?? null
        : null,
    [profile.shots, selectedShot]
  );

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play();
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    setMessage(null);
    stopCamera();
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

  async function openCamera(shotType: ShotType) {
    setMessage(null);
    stopCamera();

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1080 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setCameraShot(shotType);
      setStream(mediaStream);
    } catch (error) {
      setMessage(normalizeCameraError(error));
    }
  }

  function stopCamera() {
    setStream((current) => {
      current?.getTracks().forEach((track) => track.stop());
      return null;
    });
    setCameraShot(null);
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

  async function captureCurrentShot() {
    if (!cameraShot || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1024;
    canvas.height = video.videoHeight || 1024;
    const context = canvas.getContext("2d");

    if (!context) {
      setMessage("Не удалось сделать снимок.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setMessage("Не удалось сделать снимок.");
      return;
    }

    const file = new File([blob], `${cameraShot}.jpg`, { type: "image/jpeg" });
    stopCamera();
    await uploadShot(cameraShot, file);
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

          <div className="space-y-4">
            <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-900/60">
              {cameraShot ? (
                <div className="relative bg-black">
                  <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-[72%] w-[62%] rounded-[40%] border-2 border-white/60 shadow-[0_0_0_9999px_rgba(2,6,23,0.28)]" />
                  </div>
                </div>
              ) : (
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
              )}
            </div>

            {cameraShot ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={captureCurrentShot}
                  disabled={isPending}
                  className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-70"
                >
                  Снять
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/6"
                >
                  Назад
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => void openCamera(selectedShot)}
                  disabled={busy}
                  className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-70"
                >
                  Камера
                </button>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/6">
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    disabled={busy}
                    onChange={(event) =>
                      handleFileChange(selectedShot, event.currentTarget.files?.[0] ?? null)
                    }
                  />
                  Файл
                </label>
              </div>
            )}
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

function normalizeCameraError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "Браузер или система запретили доступ к камере. На этом устройстве лучше выбрать 'Файл' или разрешить камеру в настройках браузера и ОС.";
    }

    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "Камера не найдена. Выберите 'Файл' и загрузите готовое фото.";
    }

    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return "Камера занята другим приложением. Закройте его или выберите 'Файл'.";
    }
  }

  return "Не удалось открыть камеру. Попробуйте выбрать 'Файл'.";
}
