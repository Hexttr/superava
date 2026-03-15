import Link from "next/link";

import { SectionCard, StatusPill } from "@superava/ui";
import { ProfileProgressLine } from "@/components/profile-progress-line";
import { getProfile } from "@/lib/server-api";
import { ProfileShotUploader } from "@/components/profile-shot-uploader";

export default async function OnboardingPage() {
  const profile = await getProfile();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="text-sm text-slate-300 hover:text-white">
          Назад
        </Link>
        <StatusPill label="Профиль" tone="accent" />
      </div>

      <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/6 p-5 backdrop-blur sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-cyan-300">
          Профиль лица
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
          Добавьте 6 ракурсов без спешки.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
          Этот этап нужен один раз. Когда профиль собран качественно, все дальнейшие генерации
          выглядят стабильнее и заметно лучше удерживают ваше лицо.
        </p>
      </section>

      <section className="mt-6">
        <SectionCard eyebrow="Прогресс" title="Ракурсы">
          <ProfileProgressLine profile={profile} />
        </SectionCard>
      </section>

      <section className="mt-6">
        <SectionCard eyebrow="Камера и фото" title="Загрузите ракурсы">
          <ProfileShotUploader profile={profile} />
        </SectionCard>
      </section>
    </main>
  );
}
