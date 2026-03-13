"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { LinkedAuthProvider, SocialAuthProvider } from "@superava/shared";
import {
  authProviderMessage,
  socialProviderLabel,
  socialProviderOrder,
  socialProviderSlug,
} from "@/lib/social-auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export function LinkedAuthProvidersCard(props: {
  providers: LinkedAuthProvider[];
  initialMessage?: string | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(props.initialMessage ?? null);
  const [isPending, startTransition] = useTransition();

  function startLink(provider: SocialAuthProvider) {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch(
        `${API_URL}/api/v1/auth/providers/${socialProviderSlug(provider)}/link/start`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage(authProviderMessage(error?.error ?? "social_auth_failed", provider));
        return;
      }

      const data = (await response.json()) as { url: string };
      window.location.href = data.url;
    });
  }

  function unlink(provider: SocialAuthProvider) {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch(
        `${API_URL}/api/v1/auth/providers/${socialProviderSlug(provider)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage(authProviderMessage(error?.error ?? "social_auth_failed", provider));
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Связанные соцсети</p>
      {message ? (
        <div className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {message}
        </div>
      ) : null}
      <div className="mt-3 space-y-3">
        {socialProviderOrder.map((provider) => {
          const item =
            props.providers.find((candidate) => candidate.provider === provider) ?? null;
          const configured = item?.configured ?? false;
          const connected = item?.connected ?? false;

          return (
            <div
              key={provider}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {socialProviderLabel(provider)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {connected
                      ? item?.providerEmail ||
                        item?.displayName ||
                        "Провайдер подключен к аккаунту."
                      : configured
                        ? "Можно подключить к текущему аккаунту."
                        : "Провайдер пока не настроен."}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    connected
                      ? "border border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
                      : configured
                        ? "border border-white/10 bg-white/5 text-slate-300"
                        : "border border-amber-400/25 bg-amber-400/10 text-amber-200"
                  }`}
                >
                  {connected ? "Подключен" : configured ? "Доступен" : "Не настроен"}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {connected ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => unlink(provider)}
                    className="inline-flex items-center justify-center rounded-full border border-rose-400/25 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/15 disabled:opacity-60"
                  >
                    Отключить
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isPending || !configured}
                    onClick={() => startLink(provider)}
                    className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Подключить
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
