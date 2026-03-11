import Link from "next/link";

import { SectionCard, StatusPill } from "@superava/ui";
import { GenerationFeed } from "@/components/generation-feed";
import { getGenerations } from "@/lib/server-api";

export default async function GenerationsPage() {
  const generations = await getGenerations();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="text-sm text-slate-300 hover:text-white">
          Назад
        </Link>
        <StatusPill label="История" tone="accent" />
      </div>

      <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/6 p-5 backdrop-blur sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-cyan-300">
          Мои генерации
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
          Все ваши результаты.
        </h1>
      </section>

      <section className="mt-6">
        <SectionCard eyebrow="Статусы" title="Последние">
          <GenerationFeed
            generations={generations}
            emptyText="Пока нет ни одной генерации."
          />
        </SectionCard>
      </section>
    </main>
  );
}
