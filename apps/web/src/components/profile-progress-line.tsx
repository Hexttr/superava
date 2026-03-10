import Image from "next/image";
import type { PhotoProfile } from "@superava/shared";

export function ProfileProgressLine(props: { profile: PhotoProfile }) {
  function getShotPreviewSrc(shot: PhotoProfile["shots"][number]) {
    if (!shot.previewUrl) {
      return `/api/shot-reference/${shot.type}?size=160`;
    }

    const version = shot.previewVersion
      ? `?v=${encodeURIComponent(shot.previewVersion)}`
      : "";
    return `/api/profile-preview/${shot.type}${version}`;
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {props.profile.shots.map((shot) => {
        const ready = shot.status !== "missing";

        return (
          <div key={shot.id} className="flex flex-col gap-2">
            <div
              className={`relative overflow-hidden rounded-[1.4rem] border ${
                ready
                  ? "border-cyan-300/60 bg-cyan-300/8 ring-2 ring-cyan-300/15"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <Image
                src={getShotPreviewSrc(shot)}
                alt=""
                width={160}
                height={160}
                unoptimized
                className={`aspect-square w-full object-cover ${
                  ready ? "opacity-100" : "opacity-40"
                }`}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-950/80 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/80">
                  {shot.type.replaceAll("_", " ")}
                </span>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    ready ? "bg-cyan-300" : "bg-white/25"
                  }`}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
