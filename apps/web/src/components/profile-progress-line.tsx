import Image from "next/image";
import type { PhotoProfile } from "@superava/shared";

export function ProfileProgressLine(props: { profile: PhotoProfile }) {
  const completedCount = props.profile.shots.filter(
    (shot) => shot.status !== "missing"
  ).length;

  function getShotPreviewSrc(shot: PhotoProfile["shots"][number]) {
    if (!shot.previewUrl) {
      return `/api/shot-reference/${shot.type}?size=96`;
    }

    const version = shot.previewVersion
      ? `?v=${encodeURIComponent(shot.previewVersion)}`
      : "";
    return `/api/profile-preview/${shot.type}${version}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Ракурсы</p>
          <p className="text-sm text-slate-400">
            {completedCount} из {props.profile.shots.length}
          </p>
        </div>
        <p className="text-2xl font-semibold text-white">
          {props.profile.completionPercent}%
        </p>
      </div>

      <div className="grid grid-cols-6 gap-2 sm:gap-3">
        {props.profile.shots.map((shot) => {
          const ready = shot.status !== "missing";

          return (
            <div key={shot.id} className="flex flex-col items-center gap-2">
              <div
                className={`relative overflow-hidden rounded-2xl border ${
                  ready
                    ? "border-cyan-300/60 ring-2 ring-cyan-300/20"
                    : "border-white/10"
                }`}
              >
                <Image
                  src={getShotPreviewSrc(shot)}
                  alt=""
                  width={96}
                  height={96}
                  unoptimized
                  className={`h-14 w-14 object-cover sm:h-16 sm:w-16 ${
                    ready ? "opacity-100" : "opacity-45"
                  }`}
                />
              </div>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  ready ? "bg-cyan-300" : "bg-white/20"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
