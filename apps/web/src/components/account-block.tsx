"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AuthUser } from "@superava/shared";
import type { LinkedAuthProvider, SocialAuthProvider } from "@superava/shared";
import {
  authProviderMessage,
  socialProviderLabel,
  socialProviderOrder,
  socialProviderSlug,
} from "@/lib/social-auth";
import { SocialProviderIcon } from "@/components/social-provider-icon";
import { LogoutButton } from "@/components/logout-button";
import { ResendVerificationButton } from "@/components/resend-verification-button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

type LoginProvider = "YANDEX" | "VK" | "TELEGRAM";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visible = local.length <= 2 ? local[0] ?? "*" : `${local[0]}***`;
  return `${visible}@${domain}`;
}

function formatRub(minor: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

function getInitials(name: string | null, email: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return "?";
}

export function AccountBlock(props: {
  user: AuthUser;
  billingAvailableMinor: number;
  billingEnabled: boolean;
  textPrice: string;
  photoPrice: string;
  billingNote: string;
  linkedProviders: LinkedAuthProvider[];
  socialMessage?: string | null;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState<string | null>(props.socialMessage ?? null);
  const [isPending, startTransition] = useTransition();

  const displayName = props.user.name ?? props.user.email ?? "Пользователь";
  const email = props.user.email ?? null;
  const isAdmin = props.user.role === "ADMIN";

  function startLink(provider: SocialAuthProvider) {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(
        `${API_URL}/api/v1/auth/providers/${socialProviderSlug(provider)}/link/start`,
        { method: "POST", credentials: "include" }
      );
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage(authProviderMessage(err?.error ?? "social_auth_failed", provider));
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
        { method: "DELETE", credentials: "include" }
      );
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage(authProviderMessage(err?.error ?? "social_auth_failed", provider));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="w-full max-w-sm rounded-[1.75rem] border border-white/10 bg-slate-950/45 p-5">
      {/* Compact: avatar, name, balance, logout */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 text-lg font-semibold text-fuchsia-200">
          {getInitials(props.user.name, props.user.email)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-white">{displayName}</p>
          <p className="mt-0.5 text-2xl font-semibold text-white">
            {formatRub(props.billingAvailableMinor)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <LogoutButton className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/6" />
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
        >
          {expanded ? "Свернуть" : "Подробнее"}
        </button>
      </div>

      {expanded ? (
        <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
          {/* Email (masked) */}
          {email ? (
            <p className="text-sm text-slate-400" title={email}>
              {maskEmail(email)}
            </p>
          ) : null}

          {/* Badges: only ADMIN, verification */}
          <div className="flex flex-wrap gap-2">
            {isAdmin ? (
              <Link
                href="/admin"
                className="inline-flex items-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/15"
              >
                Админка
              </Link>
            ) : null}
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                props.user.emailVerified
                  ? "border border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
                  : "border border-amber-400/25 bg-amber-400/10 text-amber-200"
              }`}
            >
              {props.user.emailVerified ? "Email подтверждён" : "Email не подтверждён"}
            </span>
          </div>

          {/* Balance details */}
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Баланс</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {formatRub(props.billingAvailableMinor)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {props.billingEnabled
                ? `Текст: ${props.textPrice} • Фото: ${props.photoPrice}`
                : props.billingNote}
            </p>
          </div>

          {!props.user.emailVerified ? <ResendVerificationButton /> : null}

          {/* Social icons row */}
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-500">
              Связанные соцсети
            </p>
            {message ? (
              <div className="mb-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {message}
              </div>
            ) : null}
            <div className="flex items-center gap-4">
              {(socialProviderOrder as LoginProvider[]).map((provider) => {
                const item =
                  props.linkedProviders.find((c) => c.provider === provider) ?? null;
                const configured = item?.configured ?? false;
                const connected = item?.connected ?? false;
                const mainEmail = props.user.email ?? "";
                const providerEmail = item?.providerEmail ?? "";
                const showProviderEmail =
                  connected &&
                  providerEmail &&
                  providerEmail.toLowerCase() !== mainEmail.toLowerCase();

                return (
                  <div
                    key={provider}
                    className="flex flex-col items-center gap-1"
                    title={
                      connected
                        ? showProviderEmail
                          ? providerEmail
                          : `${socialProviderLabel(provider)} подключен`
                        : configured
                          ? `Подключить ${socialProviderLabel(provider)}`
                          : `${socialProviderLabel(provider)} не настроен`
                    }
                  >
                    <button
                      type="button"
                      disabled={isPending || (!configured && !connected)}
                      onClick={() => (connected ? unlink(provider) : startLink(provider))}
                      className="relative flex h-12 w-12 items-center justify-center rounded-full transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <SocialProviderIcon
                        provider={provider}
                        className="h-10 w-10"
                        faded={!connected && configured}
                      />
                      {connected ? (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[10px] text-white">
                          ✓
                        </span>
                      ) : null}
                    </button>
                    <span className="text-xs text-slate-400">
                      {connected ? "Подключен" : configured ? "Подключить" : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
