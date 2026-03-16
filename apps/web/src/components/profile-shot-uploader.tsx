"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { PhotoProfile, ShotType } from "@superava/shared";
import { StatusPill } from "@superava/ui";
import { uploadProfileShot } from "@/lib/api";
import {
  shotAngleLabels,
  shotCaptureTips,
  shotGuidanceText,
  shotLabels,
  shotStatusLabels,
} from "@/lib/ui-text";

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
    } catch {
      setMessage("Не удалось открыть камеру.");
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
        setMessage(`Фото "${shotLabels[shotType]}" загружено.`);
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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/82 p-4"
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
        className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#171126] p-5 shadow-[0_30px_120px_rgba(15,23,42,0.5)] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Ракурс профиля
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {shotLabels[selectedShot]}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {shotGuidanceText[selectedShot]}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusPill label={shotAngleLabels[selectedShot]} tone="neutral" />
              <StatusPill
                label={
                  selectedShotRecord.status === "approved"
                    ? shotStatusLabels.approved
                    : selectedShotRecord.status === "uploaded"
                      ? shotStatusLabels.uploaded
                      : shotStatusLabels.missing
                }
                tone={
                  selectedShotRecord.status === "approved"
                    ? "success"
                    : selectedShotRecord.status === "uploaded"
                      ? "accent"
                      : "warning"
                }
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/8 disabled:opacity-60"
          >
            Закрыть
          </button>
        </div>

        {message ? (
          <div className="mt-4 rounded-[1.5rem] border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
            {message}
          </div>
        ) : null}

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900/60">
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
              {shotCaptureTips.map((tip) => (
                <div
                  key={tip}
                  className="rounded-[1.3rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-slate-300"
                >
                  {tip}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {cameraShot ? (
              <div className="rounded-[1.75rem] border border-cyan-400/20 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Камера</p>
                    <p className="text-sm text-slate-400">{shotLabels[cameraShot]}</p>
                  </div>
                  <Image
                    src={`/api/shot-reference/${cameraShot}?size=80`}
                    alt=""
                    width={80}
                    height={80}
                    unoptimized
                    className="h-16 w-16 rounded-2xl border border-white/10 object-cover"
                  />
                </div>

                <div className="relative mt-4 overflow-hidden rounded-[1.75rem] border border-white/10 bg-black">
                  <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-[72%] w-[62%] rounded-[40%] border-2 border-white/60 shadow-[0_0_0_9999px_rgba(2,6,23,0.28)]" />
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={captureCurrentShot}
                    disabled={isPending}
                    className="inline-flex flex-1 items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-70"
                  >
                    Снять
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/6"
                  >
                    Назад
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <button
                  type="button"
                  onClick={() => void openCamera(selectedShot)}
                  disabled={busy}
                  className="rounded-[1.75rem] border border-cyan-400/20 bg-cyan-400/10 p-5 text-left transition hover:border-cyan-300/40 hover:bg-cyan-400/14 disabled:opacity-60"
                >
                  <p className="text-base font-semibold text-white">Камера</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Откройте фронтальную камеру, выровняйте лицо по форме и сделайте снимок сразу
                    в этом окне.
                  </p>
                </button>

                <label className="cursor-pointer rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 text-left transition hover:border-white/20 hover:bg-white/[0.05]">
                  <p className="text-base font-semibold text-white">Файл</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Выберите готовое фото из галереи или загрузите снимок, который уже сделали
                    заранее.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    disabled={busy}
                    onChange={(event) =>
                      handleFileChange(
                        selectedShot,
                        event.currentTarget.files?.[0] ?? null
                      )
                    }
                  />
                  <span className="mt-4 inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/6">
                    Выбрать фото
                  </span>
                </label>
              </div>
            )}

            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-white">Как получить лучший результат</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Держите голову ровно, не меняйте свет между ракурсами и избегайте сильных
                фильтров. Чем чище профиль, тем стабильнее лицо в генерациях.
              </p>
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
