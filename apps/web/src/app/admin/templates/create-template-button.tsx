"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/admin-api";
import { createTemplate } from "@/lib/admin-api";

export function CreateTemplateButton({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [promptSkeleton, setPromptSkeleton] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createTemplate({
        slug,
        title,
        subtitle,
        description,
        promptSkeleton,
        group: "holiday",
        previewLabel: title.slice(0, 8),
        categoryId: categoryId || null,
      });
      setSlug("");
      setTitle("");
      setSubtitle("");
      setDescription("");
      setPromptSkeleton("");
      setCategoryId("");
      setShow(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  if (!show) {
    return (
      <button
        type="button"
        onClick={() => setShow(true)}
        className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950"
      >
        + Шаблон
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-950/55 p-4">
      <input
        type="text"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder="slug"
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500"
        required
      />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Название"
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500"
        required
      />
      <input
        type="text"
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        placeholder="Подзаголовок"
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Описание"
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500"
        rows={2}
      />
      <textarea
        value={promptSkeleton}
        onChange={(e) => setPromptSkeleton(e.target.value)}
        placeholder="Промпт (skeleton)"
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500"
        rows={3}
      />
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
      >
        <option value="">— Без категории</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
        >
          Создать
        </button>
        <button
          type="button"
          onClick={() => setShow(false)}
          className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-300"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
