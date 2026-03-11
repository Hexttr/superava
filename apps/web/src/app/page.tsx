import Link from "next/link";

import { SectionCard, StatusPill } from "@superava/ui";
import { GenerationComposer } from "@/components/generation-composer";
import { GenerationFeed } from "@/components/generation-feed";
import { ProfileProgressLine } from "@/components/profile-progress-line";
import {
  getCategories,
  getGenerationPromptConfig,
  getGenerations,
  getPromptConstructor,
  getProfile,
  getTemplates,
} from "@/lib/api";
import { categoryPreviewImageUrl } from "@/lib/api";
import { templateTextBySlug } from "@/lib/ui-text";

export default async function Home() {
  const [profile, templates, generations, generationPromptConfig, promptConstructor, categories] =
    await Promise.all([
      getProfile(),
      getTemplates(),
      getGenerations(),
      getGenerationPromptConfig(),
      getPromptConstructor(),
      getCategories(),
    ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
      <section className="rounded-[2.25rem] border border-white/10 bg-white/6 p-6 shadow-[0_20px_90px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8 lg:p-10">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill label="Superava" tone="accent" />
            <StatusPill label="MVP concept" tone="neutral" />
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Один профиль лица.
            <br />
            Любые красивые сцены под ваш стиль.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Соберите профиль из шести ракурсов, выберите готовую идею или опишите свою сцену.
            Дальше Superava превращает это в фотоконтент, который выглядит цельно и персонально.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Собрать профиль
            </Link>
            <Link
              href="/templates"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/6"
            >
              Смотреть шаблоны
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.6fr_0.8fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_12px_60px_rgba(17,24,39,0.16)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-cyan-300">
                Профиль лица
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                6 ракурсов для стабильной генерации
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                Чем полнее профиль, тем аккуратнее сохраняется лицо в готовых кадрах.
              </p>
            </div>
            <div className="shrink-0">
              <p className="text-right text-3xl font-semibold text-white">
                {profile.completionPercent}%
              </p>
              <p className="mt-1 text-right text-sm text-slate-500">готовность профиля</p>
            </div>
          </div>

          <div className="mt-6">
            <ProfileProgressLine profile={profile} />
          </div>
        </div>

        <div className="rounded-[2rem] border border-cyan-400/20 bg-slate-950/65 p-5 shadow-[0_12px_60px_rgba(17,24,39,0.16)]">
          <StatusPill
            label={profile.completionPercent === 100 ? "Готово" : "Заполняется"}
            tone={profile.completionPercent === 100 ? "success" : "accent"}
          />
          <h2 className="mt-4 text-2xl font-semibold text-white">
            {profile.completionPercent === 100
              ? "Можно запускать генерации"
              : "Нужно заполнить профиль"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {profile.completionPercent === 100
              ? "Профиль собран. Можно тестировать сцены и доводить внешний вид продукта."
              : "Добавьте недостающие ракурсы, чтобы генерации держали лицо стабильно и выглядели аккуратнее."}
          </p>
          <div className="mt-6">
            <Link
              href={profile.completionPercent === 100 ? "#create" : "/onboarding"}
              className={`inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${
                profile.completionPercent === 100
                  ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                  : "border border-white/15 text-white hover:bg-white/6"
              }`}
            >
              {profile.completionPercent === 100 ? "Перейти к генерации" : "Дозаполнить профиль"}
            </Link>
          </div>
        </div>
      </section>

      <section id="create" className="mt-6">
        <SectionCard eyebrow="Создать" title="Новый кадр">
          <GenerationComposer
            templates={templates}
            profile={profile}
            generationPromptConfig={generationPromptConfig}
            promptConstructor={promptConstructor ?? undefined}
            showTemplates={false}
          />
        </SectionCard>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard eyebrow="Шаблоны" title="Готовые сцены">
          <div className="grid gap-4">
            {templates.map((template, index) => (
              <div
                key={template.id}
                className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/55"
              >
                <div
                  className={`aspect-[16/10] w-full ${
                    index % 2 === 0
                      ? "bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.35),_transparent_55%),linear-gradient(135deg,_rgba(17,24,39,0.96),_rgba(14,116,144,0.5))]"
                      : "bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.35),_transparent_55%),linear-gradient(135deg,_rgba(17,24,39,0.96),_rgba(120,53,15,0.4))]"
                  }`}
                >
                  <div className="flex h-full flex-col justify-between p-5">
                    <StatusPill label={template.previewLabel} tone="accent" />
                    <div>
                      <p className="text-xl font-semibold text-white">{template.title}</p>
                      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-200/90">
                        {templateTextBySlug[template.slug]?.description ?? template.description}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm font-medium text-slate-200">
                    {templateTextBySlug[template.slug]?.subtitle ?? template.subtitle}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Конкретный сценарий, который можно быстро адаптировать под лицо из профиля.
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <Link
              href="/templates"
              className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
            >
              Все шаблоны
            </Link>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Мои генерации" title="Последние результаты">
          <GenerationFeed
            generations={generations}
            maxItems={4}
            compact
            emptyText="Здесь будут появляться ваши свежие кадры."
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
        <SectionCard eyebrow="Категории" title="Праздничные подборки">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                href={`/templates?category=${category.id}`}
                className={`aspect-square overflow-hidden rounded-[1.75rem] border border-white/10 p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/30 ${
                  index % 3 === 0
                    ? "bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.32),_transparent_58%),linear-gradient(160deg,_rgba(15,23,42,0.96),_rgba(91,33,182,0.38))]"
                    : index % 3 === 1
                      ? "bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.32),_transparent_58%),linear-gradient(160deg,_rgba(15,23,42,0.96),_rgba(8,145,178,0.38))]"
                      : "bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.28),_transparent_58%),linear-gradient(160deg,_rgba(15,23,42,0.96),_rgba(133,77,14,0.35))]"
                }`}
              >
                <div className="flex h-full flex-col justify-between">
                  {category.previewKey ? (
                    <img
                      src={categoryPreviewImageUrl(category.id)}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <StatusPill label="Категория" tone="neutral" />
                  )}
                  <div>
                    <p className="text-xl font-semibold text-white">{category.name}</p>
                    <p className="mt-4 text-xs font-medium uppercase tracking-[0.22em] text-cyan-200/80">
                      Открыть сцену
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>
      </section>
    </main>
  );
}
