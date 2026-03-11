import type { ReactNode } from "react";

export function SectionCard(props: {
  title: string;
  eyebrow?: string;
  large?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_12px_60px_rgba(17,24,39,0.14)] backdrop-blur">
      {props.eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fuchsia-300">
          {props.eyebrow}
        </p>
      ) : null}
      <h2
        className={
          props.large
            ? "text-2xl font-semibold text-white sm:text-3xl"
            : `${props.eyebrow ? "mt-2 " : ""}text-xl font-semibold text-white`
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
    neutral: "bg-white/10 text-slate-200",
    success: "bg-emerald-500/15 text-emerald-300",
    warning: "bg-amber-500/15 text-amber-300",
    accent: "bg-fuchsia-500/15 text-fuchsia-300",
  } as const;

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${toneClasses[props.tone ?? "neutral"]}`}
    >
      {props.label}
    </span>
  );
}
