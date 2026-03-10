"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { PhotoProfile, ShotType } from "@superava/shared";
import { StatusPill } from "@superava/ui";
import { uploadProfileShot } from "@/lib/api";
import { shotLabels, shotStatusLabels } from "@/lib/ui-text";

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
        setMessage(
          error instanceof Error ? error.message : "Не удалось загрузить фото."
        );
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
    return `/api/profile-preview/${shot.type}${version}`;
  }

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          {message}
        </div>
      ) : null}

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
                  ? "border-cyan-400/30 bg-cyan-400/8"
                  : "border-white/10 bg-slate-950/55"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
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
                <p className="text-sm font-semibold text-white">{shotLabels[shot.type]}</p>
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
