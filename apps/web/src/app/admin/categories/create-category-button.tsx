"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCategory } from "@/lib/admin-api";

export function CreateCategoryButton() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createCategory({ name, sortOrder });
      setName("");
      setSortOrder(0);
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
        + Категория
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500"
          required
        />
      </div>
      <div>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
          className="w-20 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
        />
      </div>
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
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
