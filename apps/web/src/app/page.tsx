import Link from "next/link";

import { SectionCard } from "@superava/ui";
import { GenerationGallery } from "@/components/generation-gallery";
import { HomeDirectionCards } from "@/components/home-direction-cards";
import { LogoutButton } from "@/components/logout-button";
import { ProfileProgressLine } from "@/components/profile-progress-line";
import { ResendVerificationButton } from "@/components/resend-verification-button";
import {
  getCategories,
  getCurrentUser,
  getGenerationPromptConfig,
  getGenerations,
  getPromptConstructor,
  getProfile,
  getTemplates,
} from "@/lib/server-api";

function LogoIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 text-white"
      aria-hidden
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="10"
        r="4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 20c2-3 5-4 7-4s5 1 7 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const CATEGORY_IMAGE_VERSION = 2;
const CATEGORY_IMAGES: Record<string, string> = {
  "8 марта": `/images/category-8marta.jpg?v=${CATEGORY_IMAGE_VERSION}`,
  "Новый год": `/images/category-newyear.jpg?v=${CATEGORY_IMAGE_VERSION}`,
  "День рождения": `/images/category-birthday.jpg?v=${CATEGORY_IMAGE_VERSION}`,
  "День победы": `/images/category-victory.jpg?v=${CATEGORY_IMAGE_VERSION}`,
  "23 февраля": `/images/category-23feb.jpg?v=${CATEGORY_IMAGE_VERSION}`,
  Хэллоуин: `/images/category-halloween.jpg?v=${CATEGORY_IMAGE_VERSION}`,
};

export default async function Home() {
  const [user, profile, templates, generations, generationPromptConfig, promptConstructor, categories] =
    await Promise.all([
      getCurrentUser(),
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
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2.5">
              <LogoIcon />
              <span className="text-xl font-semibold tracking-tight text-fuchsia-300">
                newava.pro
              </span>
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Один профиль лица.
              <br />
              Любые красивые сцены под твой стиль.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Собери профиль из шести ракурсов, выбери готовую идею или опиши свою сцену.
              newava.pro превратит это в фотоконтент, который выглядит цельно и персонально.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-full bg-fuchsia-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
              >
                Собрать профиль
              </Link>
              <Link
                href="/templates"
                style={{ color: "#0f172a" }}
                className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white px-6 py-3 text-sm font-semibold transition hover:bg-white/90"
              >
                Готовые сцены
              </Link>
            </div>
          </div>
          <div className="w-full max-w-sm rounded-[1.75rem] border border-white/10 bg-slate-950/45 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-fuchsia-300">
              Аккаунт
            </p>
            <p className="mt-3 text-lg font-semibold text-white">
              {user?.name ?? user?.email ?? "Пользователь"}
            </p>
            <p className="mt-1 text-sm text-slate-400">{user?.email ?? "Email не указан"}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-3 py-1 text-xs font-semibold text-fuchsia-200">
                {user?.role ?? "USER"}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  user?.emailVerified
                    ? "border border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
                    : "border border-amber-400/25 bg-amber-400/10 text-amber-200"
                }`}
              >
                {user?.emailVerified ? "Email verified" : "Email not verified"}
              </span>
              {user?.role === "ADMIN" ? (
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/15"
                >
                  Открыть админку
                </Link>
              ) : null}
            </div>
            {!user?.emailVerified ? <ResendVerificationButton /> : null}
            <div className="mt-5">
              <LogoutButton />
            </div>
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
        <SectionCard title="Выберите способ">
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
        <SectionCard title="Мои изображения" large>
          <GenerationGallery
            generations={generations}
            maxItems={8}
            emptyText="Здесь появятся ваши кадры. Выберите способ выше и запустите генерацию."
          />
          <div className="mt-5">
            <Link
              href="/generations"
              className="inline-flex items-center justify-center rounded-full bg-fuchsia-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
            >
              Все изображения
            </Link>
          </div>
        </SectionCard>
      </section>

      {/* Categories */}
      <section className="mt-6">
        <SectionCard title="Каталог сцен" large>
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageSrc}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
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
                      Открыть подборку
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
