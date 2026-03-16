import Image from "next/image";
import type { PhotoProfile, ShotType } from "@superava/shared";
import { shotLabels, shotShortLabels, shotStatusLabels } from "@/lib/ui-text";

export function ProfileProgressLine(props: {
  profile: PhotoProfile;
  interactive?: boolean;
  activeShot?: ShotType | null;
  onSelectShot?: (shotType: ShotType) => void;
}) {
  function getShotPreviewSrc(shot: PhotoProfile["shots"][number]) {
    if (!shot.previewUrl) {
      return `/api/shot-reference/${shot.type}?size=160`;
    }

    const version = shot.previewVersion
      ? `?v=${encodeURIComponent(shot.previewVersion)}`
      : "";
    return `${shot.previewUrl}${version}`;
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {props.profile.shots.map((shot) => {
        const ready = shot.status !== "missing";
        const isActive = props.activeShot === shot.type;
        const clickHint = ready ? "обновить фото" : "добавить фото";

        const previewCard = (
          <div
            className={`relative overflow-hidden rounded-[1.4rem] border transition ${
              isActive
                ? "border-cyan-300/60 bg-cyan-300/10 ring-2 ring-cyan-300/20"
                : ready
                  ? "border-fuchsia-300/60 bg-fuchsia-300/8 ring-2 ring-fuchsia-300/15"
                  : "border-white/10 bg-white/5"
            } ${props.interactive ? "hover:-translate-y-0.5 hover:border-cyan-300/40" : ""}`}
          >
            <Image
              src={getShotPreviewSrc(shot)}
              alt={shotLabels[shot.type]}
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
                {shotShortLabels[shot.type]}
              </span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  ready ? "bg-fuchsia-300" : "bg-white/25"
                }`}
              />
            </div>
          </div>
        );

        return (
          <div key={shot.id} className="flex flex-col gap-2">
            {props.interactive ? (
              <button
                type="button"
                onClick={() => props.onSelectShot?.(shot.type)}
                className="text-left"
                aria-label={`${shotLabels[shot.type]}: ${clickHint}`}
              >
                {previewCard}
              </button>
            ) : (
              previewCard
            )}
            <div>
              <p className="text-xs font-semibold text-white">{shotLabels[shot.type]}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                {shot.status === "approved"
                  ? shotStatusLabels.approved
                  : shot.status === "uploaded"
                    ? shotStatusLabels.uploaded
                    : shotStatusLabels.missing}
              </p>
              {props.interactive ? (
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-cyan-300/90">
                  Нажмите, чтобы {clickHint}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
