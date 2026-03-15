"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { PhotoProfile, ShotType } from "@superava/shared";
import { StatusPill } from "@superava/ui";
import { uploadProfileShot } from "@/lib/api";
import {
  formatShotStep,
  shotAngleLabels,
  shotCaptureTips,
  shotGuidanceText,
  shotLabels,
  shotStatusLabels,
} from "@/lib/ui-text";

export function ProfileShotUploader(props: { profile: PhotoProfile }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeShot, setActiveShot] = useState<ShotType | null>(null);
  const [cameraShot, setCameraShot] = useState<ShotType | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const nextMissingShot = useMemo(
    () => props.profile.shots.find((shot) => shot.status === "missing")?.type ?? null,
    [props.profile.shots]
  );
  const readyShots = useMemo(
    () => props.profile.shots.filter((shot) => shot.status !== "missing").length,
    [props.profile.shots]
  );
  const nextShotIndex = useMemo(
    () =>
      nextMissingShot
        ? props.profile.shots.findIndex((shot) => shot.type === nextMissingShot)
        : props.profile.shots.length - 1,
    [nextMissingShot, props.profile.shots]
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

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-[1.5rem] border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
                Guided Flow
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
                Соберите стабильный профиль из шести ракурсов
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Чем аккуратнее и ровнее собран профиль, тем чаще генерация сохраняет ваше
                лицо, выражение и пропорции без искажений.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Готово</p>
              <p className="mt-1 text-3xl font-semibold text-white">{readyShots}/6</p>
              <p className="mt-1 text-xs text-slate-400">
                {props.profile.completionPercent}% профиля собрано
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {shotCaptureTips.map((tip) => (
              <div
                key={tip}
                className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-slate-300"
              >
                {tip}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-cyan-400/20 bg-cyan-400/8 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
            Следующий ракурс
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {nextMissingShot ? shotLabels[nextMissingShot] : "Профиль собран"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {nextMissingShot
              ? shotGuidanceText[nextMissingShot]
              : "Все шесть ракурсов уже загружены. Можно переходить к генерациям и запускать сцены."}
          </p>
          {nextMissingShot ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusPill
                label={formatShotStep(nextShotIndex, props.profile.shots.length)}
                tone="accent"
              />
              <StatusPill label={shotAngleLabels[nextMissingShot]} tone="neutral" />
            </div>
          ) : (
            <div className="mt-4">
              <StatusPill label="Профиль готов" tone="success" />
            </div>
          )}
        </div>
      </div>

      {cameraShot ? (
        <div className="rounded-[2rem] border border-cyan-400/20 bg-slate-950/60 p-4">
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
              Закрыть
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {props.profile.shots.map((shot) => {
          const isCurrent = nextMissingShot === shot.type;
          const busy = isPending && activeShot === shot.type;

          return (
            <div
              key={shot.id}
              className={`rounded-[1.75rem] border p-3 ${
                isCurrent
                  ? "border-cyan-400/30 bg-cyan-400/8 shadow-[0_10px_40px_rgba(34,211,238,0.08)]"
                  : "border-white/10 bg-slate-950/55"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{shotLabels[shot.type]}</p>
                  <p className="mt-1 text-xs text-slate-500">{shotAngleLabels[shot.type]}</p>
                </div>
                <StatusPill
                  label={
                    busy
                      ? shotStatusLabels.uploading
                      : shot.status === "approved"
                        ? shotStatusLabels.approved
                        : shot.status === "missing"
                          ? shotStatusLabels.missing
                          : shotStatusLabels.uploaded
                  }
                  tone={
                    busy
                      ? "accent"
                      : shot.status === "approved"
                        ? "success"
                        : shot.status === "missing"
                          ? "warning"
                          : "accent"
                  }
                />
              </div>

              <div className="mt-3 overflow-hidden rounded-[1.5rem] border border-white/10">
                <Image
                  src={getShotPreviewSrc(shot)}
                  alt={shotLabels[shot.type]}
                  width={220}
                  height={220}
                  unoptimized
                  className={`aspect-square w-full object-cover ${
                    shot.status === "missing" ? "opacity-60" : "opacity-100"
                  }`}
                />
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {shotGuidanceText[shot.type]}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void openCamera(shot.type)}
                  disabled={busy}
                  className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-70"
                >
                  Камера
                </button>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/6">
                  Файл
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    disabled={busy}
                    onChange={(event) =>
                      handleFileChange(
                        shot.type,
                        event.currentTarget.files?.[0] ?? null
                      )
                    }
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
