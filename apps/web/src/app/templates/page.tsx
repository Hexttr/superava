import Link from "next/link";

import { SectionCard, StatusPill } from "@superava/ui";
import { GenerationComposer } from "@/components/generation-composer";
import {
  getGenerationPromptConfig,
  getProfile,
  getPromptConstructor,
  getTemplates,
} from "@/lib/server-api";
import { templateTextBySlug } from "@/lib/ui-text";

function formatRub(minor: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const categoryId = params.category;

  const [templates, profile, generationPromptConfig, promptConstructor] = await Promise.all([
    getTemplates(),
    getProfile(),
    getGenerationPromptConfig(),
    getPromptConstructor(),
  ]);

  const filteredTemplates = categoryId
    ? templates.filter((t) => (t as { categoryId?: string | null }).categoryId === categoryId)
    : templates;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="text-sm text-slate-300 hover:text-white">
          Назад
        </Link>
        <StatusPill label="Шаблоны" tone="accent" />
      </div>

      <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/6 p-5 backdrop-blur sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-cyan-300">
          Галерея
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
          Выберите стиль.
        </h1>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {filteredTemplates.map((template) => (
          <div key={template.id} id={template.slug} className="scroll-mt-24">
            <SectionCard eyebrow={template.group} title={template.title}>
              <div className="space-y-3">
                <StatusPill label={template.previewLabel} tone="accent" />
                <p className="text-sm font-semibold text-fuchsia-300">{formatRub(template.priceMinor)}</p>
                <p>{templateTextBySlug[template.slug]?.subtitle ?? template.subtitle}</p>
                <p>{templateTextBySlug[template.slug]?.description ?? template.description}</p>
                <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/50 p-5 text-center text-sm text-slate-400">
                  Превью {template.title}
                </div>
              </div>
            </SectionCard>
          </div>
        ))}
      </section>

      <section className="mt-6">
        <SectionCard eyebrow="Создать" title="Запуск">
          <GenerationComposer
            templates={templates}
            profile={profile}
            generationPromptConfig={generationPromptConfig}
            promptConstructor={promptConstructor ?? undefined}
          />
        </SectionCard>
      </section>
    </main>
  );
}
