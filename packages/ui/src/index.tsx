import type { ReactNode } from "react";

export function SectionCard(props: {
  title: string;
  eyebrow?: string;
  large?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 shadow-[0_20px_80px_rgba(15,23,42,0.28)] backdrop-blur sm:p-6">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/35 to-transparent" />
      {props.eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-300/90">
          {props.eyebrow}
        </p>
      ) : null}
      <h2
        className={
          props.large
            ? "mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl"
            : `${props.eyebrow ? "mt-2 " : ""}text-xl font-semibold tracking-tight text-white`
        }
      >
        {props.title}
      </h2>
      <div className="mt-4 text-sm text-slate-300">{props.children}</div>
    </section>
  );
}

export function StatusPill(props: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "accent";
}) {
  const toneClasses = {
    neutral: "border border-white/10 bg-white/8 text-slate-200",
    success: "border border-emerald-400/20 bg-emerald-500/15 text-emerald-300",
    warning: "border border-amber-400/20 bg-amber-500/15 text-amber-300",
    accent: "border border-fuchsia-400/20 bg-fuchsia-500/15 text-fuchsia-300",
  } as const;

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] ${toneClasses[props.tone ?? "neutral"]}`}
    >
      {props.label}
    </span>
  );
}
