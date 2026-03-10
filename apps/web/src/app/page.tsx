import Link from "next/link";

import { SectionCard, StatusPill } from "@superava/ui";
import { GenerationComposer } from "@/components/generation-composer";
import { GenerationFeed } from "@/components/generation-feed";
import { getGenerations, getProfile, getTemplates } from "@/lib/api";
import {
  shotAngleLabels,
  shotLabels,
  shotStatusLabels,
  templateTextBySlug,
} from "@/lib/ui-text";

export default async function Home() {
  const [profile, templates, generations] = await Promise.all([
    getProfile(),
    getTemplates(),
    getGenerations(),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-white/10 bg-white/6 p-5 shadow-[0_20px_90px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <StatusPill label="MVP" tone="accent" />
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Gemini + Sharp + async jobs
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-cyan-300">
                Superava
              </p>
              <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Один профиль лица.
                <br />
                Красивые фото по запросу.
              </h1>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Создать профиль
                </Link>
                <Link
                  href="/templates"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/6"
                >
                  Шаблоны
                </Link>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-cyan-400/20 bg-slate-950/70 p-4">
              <p className="text-sm font-medium text-slate-400">
                Готовность профиля
              </p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-4xl font-semibold text-white">
                    {profile.completionPercent}%
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    6 ракурсов
                  </p>
                </div>
                <StatusPill label="в работе" tone="success" />
              </div>

              <div className="mt-5 space-y-3">
                {profile.shots.map((shot) => (
                  <div
                    key={shot.id}
                    className="rounded-2xl border border-white/8 bg-white/5 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">
                        {shotLabels[shot.type]}
                      </p>
                      <StatusPill
                        label={
                          shot.status === "approved"
                            ? shotStatusLabels.approved
                            : shot.status === "missing"
                              ? shotStatusLabels.missing
                              : shotStatusLabels.uploaded
                        }
                        tone={
                          shot.status === "approved"
                            ? "success"
                            : shot.status === "missing"
                              ? "warning"
                              : "accent"
                        }
                      />
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      {shotAngleLabels[shot.type]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <SectionCard eyebrow="Профиль" title="6 ракурсов">
          <p>Анфас, улыбка, 45° и профили.</p>
        </SectionCard>

        <SectionCard eyebrow="Режимы" title="2 сценария">
          <p>Свободный запрос и готовые шаблоны.</p>
        </SectionCard>

        <SectionCard eyebrow="Фон" title="Без ожидания">
          <p>Генерация идет отдельно, вы продолжаете выбирать.</p>
        </SectionCard>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionCard eyebrow="Шаблоны" title="Подборка">
          <div className="grid gap-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="rounded-3xl border border-white/10 bg-slate-950/55 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {template.title}
                    </p>
                    <p className="text-sm text-slate-400">
                      {templateTextBySlug[template.slug]?.subtitle ?? template.subtitle}
                    </p>
                  </div>
                  <StatusPill label={template.previewLabel} tone="accent" />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {templateTextBySlug[template.slug]?.description ?? template.description}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Мои генерации" title="Статусы">
          <GenerationFeed
            generations={generations}
            maxItems={3}
            compact
            emptyText="Здесь появятся ваши новые кадры."
          />
          <div className="mt-5">
            <Link
              href="/generations"
              className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
            >
              Вся история
            </Link>
          </div>
        </SectionCard>
      </section>

      <section className="mt-6">
        <SectionCard eyebrow="Создать" title="Новая генерация">
          <GenerationComposer templates={templates} />
        </SectionCard>
      </section>
    </main>
  );
}
