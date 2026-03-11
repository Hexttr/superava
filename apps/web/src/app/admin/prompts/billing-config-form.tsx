"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminAppConfig } from "@/lib/admin-api";
import { updateAdminAppConfig } from "@/lib/admin-api";

export function BillingConfigForm({ config }: { config: AdminAppConfig }) {
  const router = useRouter();
  const [billingEnabled, setBillingEnabled] = useState(config.billingEnabled);
  const [textPriceRub, setTextPriceRub] = useState(String(config.textGenerationPriceMinor / 100));
  const [photoPriceRub, setPhotoPriceRub] = useState(
    String(config.photoGenerationPriceMinor / 100)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await updateAdminAppConfig({
        billingEnabled,
        textGenerationPriceMinor: Math.max(0, Math.round(Number(textPriceRub || "0") * 100)),
        photoGenerationPriceMinor: Math.max(0, Math.round(Number(photoPriceRub || "0") * 100)),
      });
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Billing</h2>
          <p className="mt-1 text-sm text-slate-400">
            Фиксированная цена для текста и фото, отдельные цены задаются у шаблонов.
          </p>
        </div>
        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">
          {config.currency}
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-sm text-slate-400">Текстовая генерация, RUB</label>
          <input
            type="number"
            min="0"
            step="1"
            value={textPriceRub}
            onChange={(e) => setTextPriceRub(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400">Генерация по фото, RUB</label>
          <input
            type="number"
            min="0"
            step="1"
            value={photoPriceRub}
            onChange={(e) => setPhotoPriceRub(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          />
        </div>
      </div>
      <label className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={billingEnabled}
          onChange={(e) => setBillingEnabled(e.target.checked)}
        />
        <span>Включить списание баланса при запуске генераций</span>
      </label>
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="mt-4 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
      >
        Сохранить цены
      </button>
    </form>
  );
}
