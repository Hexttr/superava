"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/admin-api";
import { updateCategory, uploadCategoryPreview, deleteCategory } from "@/lib/admin-api";

export function CategoryEditForm({ category }: { category: Category }) {
  const router = useRouter();
  const [name, setName] = useState(category.name);
  const [sortOrder, setSortOrder] = useState(category.sortOrder);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await updateCategory(category.id, { name, sortOrder });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Удалить категорию?")) return;
    setLoading(true);
    try {
      await deleteCategory(category.id);
      router.push("/admin/categories");
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
      await uploadCategoryPreview(category.id, file);
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
        <label className="block text-sm text-slate-400">Название</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-slate-400">Порядок</label>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
        />
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
