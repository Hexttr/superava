"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PromptPart } from "@/lib/admin-api";
import { updatePromptPart } from "@/lib/admin-api";

const promptPartHints: Record<string, string> = {
  base: "Главный системный слой. Здесь не стоит ослаблять требования к идентичности лица.",
  identity_lock: "Дополнительная жесткая фиксация черт лица, возраста и общего likeness.",
  realism_guardrails:
    "Защищает от типичных AI-артефактов: пластиковой кожи, лишних пальцев, странного света и аксессуаров.",
  profile_meta:
    "Можно использовать плейсхолдеры {count} и {percent}, чтобы усилить роль полноты профиля.",
  closed_mouth:
    "Активируется, когда в профиле нет улыбки. Помогает избежать случайно открытого рта.",
  free_mode: "Инструкция именно для свободного текстового режима.",
  template_mode: "Инструкция именно для режима шаблонов и готовых сцен.",
  reference_mode: "Инструкция для режима фото-референса.",
  reference_scene_prefix:
    "Префикс перед описанием сцены, извлечённой из изображения-референса.",
  short_expansion:
    "Используется, когда запрос короткий. Помогает автоматически достраивать сцену.",
  user_request_prefix: "Добавляется перед пользовательским запросом в обычном режиме.",
  enhance_portrait: "Применяется только когда включен чекбокс улучшения портрета.",
};

export function PromptPartEditor({ part }: { part: PromptPart }) {
  const router = useRouter();
  const [label, setLabel] = useState(part.label);
  const [value, setValue] = useState(part.value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await updatePromptPart(part.key, { label, value });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/10 bg-slate-950/55 p-4"
    >
      <div className="flex items-center justify-between">
        <code className="text-sm font-medium text-cyan-300">{part.key}</code>
        <span className="text-xs text-slate-500">sort: {part.sortOrder}</span>
      </div>
      <div className="mt-3">
        <label className="block text-sm text-slate-400">Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
        />
      </div>
      <div className="mt-3">
        <label className="block text-sm text-slate-400">Value</label>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white"
          rows={Math.min(8, Math.max(3, value.split("\n").length))}
        />
        {promptPartHints[part.key] ? (
          <p className="mt-1 text-xs text-slate-500">
            {promptPartHints[part.key]}
          </p>
        ) : null}
        {(part.key === "profile_meta" ||
          part.key === "short_expansion" ||
          part.key === "user_request_prefix") && (
          <p className="mt-1 text-xs text-slate-500">
            Плейсхолдеры:{" "}
            {part.key === "profile_meta"
              ? "{count}, {percent}"
              : part.key.includes("request")
                ? "пользовательский текст дописывается в конец"
                : "пользовательский текст дописывается"}
          </p>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-3 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
      >
        Сохранить
      </button>
    </form>
  );
}
