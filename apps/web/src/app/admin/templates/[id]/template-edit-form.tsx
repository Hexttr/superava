"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Category, PromptTemplateAdmin } from "@/lib/admin-api";
import {
  updateTemplate,
  deleteTemplate,
  uploadTemplatePreview,
} from "@/lib/admin-api";

export function TemplateEditForm({
  template,
  categories,
}: {
  template: PromptTemplateAdmin;
  categories: Category[];
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(template.slug);
  const [title, setTitle] = useState(template.title);
  const [subtitle, setSubtitle] = useState(template.subtitle);
  const [description, setDescription] = useState(template.description);
  const [promptSkeleton, setPromptSkeleton] = useState(template.promptSkeleton);
  const [categoryId, setCategoryId] = useState(template.categoryId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await updateTemplate(template.id, {
        slug,
        title,
        subtitle,
        description,
        promptSkeleton,
        categoryId: categoryId || null,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Удалить шаблон?")) return;
    setLoading(true);
    try {
      await deleteTemplate(template.id);
      router.push("/admin/templates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function handlePreviewUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      await uploadTemplatePreview(template.id, file);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div>
        <label className="block text-sm text-slate-400">Slug</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-slate-400">Название</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-slate-400">Подзаголовок</label>
        <input
          type="text"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
        />
      </div>
      <div>
        <label className="block text-sm text-slate-400">Описание</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          rows={2}
        />
      </div>
      <div>
        <label className="block text-sm text-slate-400">Промпт (skeleton)</label>
        <textarea
          value={promptSkeleton}
          onChange={(e) => setPromptSkeleton(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white font-mono text-sm"
          rows={6}
        />
      </div>
      <div>
        <label className="block text-sm text-slate-400">Категория</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
        >
          <option value="">— Без категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm text-slate-400">Превью</label>
        <input
          type="file"
          accept="image/*"
          onChange={handlePreviewUpload}
          disabled={loading}
          className="mt-1 w-full text-sm text-slate-300 file:mr-2 file:rounded-lg file:border-0 file:bg-cyan-500 file:px-3 file:py-2 file:text-slate-950"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
        >
          Сохранить
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="rounded-lg border border-red-500/50 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
        >
          Удалить
        </button>
      </div>
    </form>
  );
}
