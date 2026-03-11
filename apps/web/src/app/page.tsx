import Image from "next/image";
import Link from "next/link";

import { SectionCard, StatusPill } from "@superava/ui";
import { GenerationGallery } from "@/components/generation-gallery";
import { HomeDirectionCards } from "@/components/home-direction-cards";
import { ProfileProgressLine } from "@/components/profile-progress-line";
import {
  getCategories,
  getGenerationPromptConfig,
  getGenerations,
  getPromptConstructor,
  getProfile,
  getTemplates,
} from "@/lib/api";

const CATEGORY_IMAGES: Record<string, string> = {
  "8 марта": "/images/category-8marta.jpg",
  "Новый год": "/images/category-newyear.jpg",
  "День рождения": "/images/category-birthday.jpg",
  "День победы": "/images/category-victory.jpg",
  "23 февраля": "/images/category-23feb.jpg",
  Хэллоуин: "/images/category-halloween.jpg",
};

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
      {/* Hero */}
      <section className="rounded-[2.25rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_90px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8 lg:p-10">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill label="Superava" tone="accent" />
            <StatusPill label="Для тебя" tone="neutral" />
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Один профиль лица.
            <br />
            Любые красивые сцены под твой стиль.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Собери профиль из шести ракурсов, выбери готовую идею или опиши свою сцену.
            Superava превратит это в фотоконтент, который выглядит цельно и персонально.
          </p>
          <div className="mt-8">
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center rounded-full bg-fuchsia-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
            >
              Собрать профиль
            </Link>
          </div>
        </div>
      </section>

      {/* Profile */}
      <section className="mt-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_12px_60px_rgba(17,24,39,0.16)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-fuchsia-300">
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
      </section>

      {/* 3 direction cards + forms */}
      <section className="mt-6">
        <SectionCard eyebrow="Создать" title="Выберите способ">
          <HomeDirectionCards
            profile={profile}
            templates={templates}
            generationPromptConfig={generationPromptConfig}
            promptConstructor={promptConstructor ?? undefined}
          />
        </SectionCard>
      </section>

      {/* My generations */}
      <section className="mt-6">
        <SectionCard eyebrow="Галерея" title="Мои генерации">
          <GenerationGallery
            generations={generations}
            maxItems={8}
            emptyText="Здесь появятся ваши кадры. Выберите способ выше и запустите генерацию."
          />
          <div className="mt-5">
            <Link
              href="/generations"
              className="text-sm font-medium text-fuchsia-300 transition hover:text-fuchsia-200"
            >
              Вся история
            </Link>
          </div>
        </SectionCard>
      </section>

      {/* Categories */}
      <section className="mt-6">
        <SectionCard eyebrow="Подборки" title="Праздничные сцены">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {categories.map((category) => {
              const imageSrc = CATEGORY_IMAGES[category.name];
              return (
                <Link
                  key={category.id}
                  href={`/templates?category=${category.id}`}
                  className="group relative aspect-square overflow-hidden rounded-[1.75rem] border border-white/10 transition hover:-translate-y-0.5 hover:border-fuchsia-300/30"
                >
                  {imageSrc ? (
                    <>
                      <Image
                        src={imageSrc}
                        alt=""
                        fill
                        className="object-cover transition group-hover:scale-105"
                        sizes="(max-width: 1280px) 50vw, 25vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/30 via-purple-500/20 to-transparent" />
                  )}
                  <div className="relative flex h-full flex-col justify-end p-5">
                    <p className="text-xl font-semibold text-white drop-shadow-lg">
                      {category.name}
                    </p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.22em] text-fuchsia-200/90">
                      Открыть сцену
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      </section>
    </main>
  );
}
