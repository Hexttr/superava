import Image from "next/image";
import Link from "next/link";

import { SectionCard } from "@superava/ui";
import { AuthPageBackground } from "@/components/auth-page-background";
import { ArrowRightIcon, GalleryIcon, UploadIcon } from "@/components/ui-icons";
import { GenerationGallery } from "@/components/generation-gallery";
import { HomeDirectionCards } from "@/components/home-direction-cards";
import { AccountBlock } from "@/components/account-block";
import { ProfileProgressLine } from "@/components/profile-progress-line";
import { authProviderMessage, socialProviderLabel, socialProviderOrder } from "@/lib/social-auth";
import {
  getBillingMe,
  getBillingPricing,
  getCategories,
  getCurrentUser,
  getGenerationPromptConfig,
  getGenerations,
  getLinkedAuthProviders,
  getPromptConstructor,
  getProfile,
  getTemplates,
} from "@/lib/server-api";


const CATEGORY_IMAGE_VERSION = 2;
const CATEGORY_IMAGES: Record<string, string> = {
  "8 марта": `/images/category-8marta.jpg?v=${CATEGORY_IMAGE_VERSION}`,
  "Новый год": `/images/category-newyear.jpg?v=${CATEGORY_IMAGE_VERSION}`,
  "День рождения": `/images/category-birthday.jpg?v=${CATEGORY_IMAGE_VERSION}`,
  "День победы": `/images/category-victory.jpg?v=${CATEGORY_IMAGE_VERSION}`,
  "23 февраля": `/images/category-23feb.jpg?v=${CATEGORY_IMAGE_VERSION}`,
  Хэллоуин: `/images/category-halloween.jpg?v=${CATEGORY_IMAGE_VERSION}`,
};

function formatRub(minor: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

function firstSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const socialLinkProvider = firstSearchParam(searchParams.provider);
  const socialLinkError = firstSearchParam(searchParams.socialLinkError);
  const socialLinked = firstSearchParam(searchParams.socialLinked);
  const socialLinkedProvider =
    socialLinked &&
    socialProviderOrder.includes(socialLinked.toUpperCase() as (typeof socialProviderOrder)[number])
      ? socialLinked.toUpperCase()
      : null;
  const socialMessage = socialLinkError
    ? authProviderMessage(socialLinkError, socialLinkProvider)
    : socialLinkedProvider
      ? `${socialProviderLabel(
          socialLinkedProvider as (typeof socialProviderOrder)[number]
        )} подключен к аккаунту.`
      : null;

  const [
    user,
    billing,
    pricing,
    profile,
    templates,
    generations,
    generationPromptConfig,
    promptConstructor,
    categories,
    linkedProviders,
  ] =
    await Promise.all([
      getCurrentUser(),
      getBillingMe(),
      getBillingPricing(),
      getProfile(),
      getTemplates(),
      getGenerations(),
      getGenerationPromptConfig(),
      getPromptConstructor(),
      getCategories(),
      getLinkedAuthProviders(),
    ]);

  return (
    <>
      <AuthPageBackground />
      <main className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="rounded-[2.25rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_90px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt=""
                width={56}
                height={56}
                className="shrink-0 rounded-xl"
                priority
              />
              <span
                className="text-2xl font-bold tracking-tight sm:text-3xl"
                style={{
                  background: "linear-gradient(135deg, #e879f9 0%, #c084fc 50%, #a855f7 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                superava
              </span>
            </div>
            <h1 className="mt-5 text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
              Загрузи свои фото и наслаждайся
              <br />
              супер аватарками
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Собери профиль из шести ракурсов, выбери готовую идею или опиши свою сцену.
              superava превратит это в фотоконтент, который выглядит цельно и персонально.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-fuchsia-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
              >
                <UploadIcon />
                Собрать профиль
              </Link>
              <Link
                href="/templates"
                style={{ color: "#0f172a" }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white px-6 py-3 text-sm font-semibold transition hover:bg-white/90"
              >
                <GalleryIcon />
                Готовые сцены
              </Link>
            </div>
          </div>
          {user ? (
            <AccountBlock
              user={user}
              billingAvailableMinor={billing?.availableMinor ?? 0}
              billingEnabled={pricing.billingEnabled}
              textPrice={formatRub(pricing.textGenerationPriceMinor)}
              photoPrice={formatRub(pricing.photoGenerationPriceMinor)}
              billingNote="Платежи пока в режиме настройки, цены уже доступны в админке."
              linkedProviders={linkedProviders}
              socialMessage={socialMessage}
            />
          ) : null}
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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-fuchsia-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
            >
              <GalleryIcon />
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
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 transition hover:-translate-y-0.5 hover:border-fuchsia-300/30"
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
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.22em] text-fuchsia-200/90">
                      Открыть подборку
                      <ArrowRightIcon className="h-3 w-3" />
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      </section>
      </main>
    </>
  );
}
