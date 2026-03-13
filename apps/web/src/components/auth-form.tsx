"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { authProviderMessage, socialProviderLabel, socialProviderOrder, socialProviderSlug } from "@/lib/social-auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

type AuthFormMode = "login" | "register";

function normalizeAuthError(message: string, mode: AuthFormMode) {
  switch (message) {
    case "invalid_credentials":
      return "Неверный email или пароль.";
    case "account_blocked":
      return "Аккаунт заблокирован. Обратитесь к администратору.";
    case "email_taken":
      return "Этот email уже зарегистрирован.";
    case "password_too_short":
      return "Пароль должен содержать не менее 6 символов.";
    case "invalid_email":
      return "Введите корректный email.";
    case "email_and_password_required":
      return "Введите email и пароль.";
    case "too_many_attempts":
      return "Слишком много попыток. Попробуйте позже.";
    case "auth_failed":
      return mode === "login"
        ? "Не удалось выполнить вход. Попробуйте еще раз."
        : "Не удалось создать аккаунт. Попробуйте еще раз.";
    default:
      return authProviderMessage(message) || "Произошла ошибка. Попробуйте еще раз.";
  }
}

function SocialProviderIcon({ provider }: { provider: (typeof socialProviderOrder)[number] }) {
  switch (provider) {
    case "YANDEX":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path
            fill="currentColor"
            d="M13.14 4H10.8c-2.82 0-4.7 1.45-4.7 3.98 0 2.03 1.12 3.23 2.86 4.38l2.33 1.53L7.08 20h2.74l3.62-5.4V20h2.48V4h-2.78Zm.3 8.41-2.77-1.84c-1.21-.8-1.95-1.47-1.95-2.62 0-1.33.96-2.04 2.49-2.04h2.23v6.5Z"
          />
        </svg>
      );
    case "VK":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path
            fill="currentColor"
            d="M4.87 4.5C3.83 4.5 3 5.33 3 6.37v11.26c0 1.04.83 1.87 1.87 1.87h14.26c1.04 0 1.87-.83 1.87-1.87V6.37c0-1.04-.83-1.87-1.87-1.87H4.87Zm11.98 10.33h-1.4c-.53 0-.69-.42-1.64-1.38-.84-.8-1.21-.91-1.42-.91-.3 0-.39.08-.39.48v1.26c0 .34-.11.54-1 .54-1.48 0-3.12-.9-4.28-2.57-1.74-2.44-2.22-4.27-2.22-4.63 0-.2.08-.39.48-.39h1.41c.36 0 .5.16.64.55.69 2 1.84 3.75 2.31 3.75.18 0 .26-.08.26-.53V8.94c-.05-.95-.55-1.03-.55-1.37 0-.17.14-.34.37-.34h2.2c.29 0 .4.16.4.51V10.5c0 .29.13.39.21.39.18 0 .33-.1.66-.43 1.03-1.15 1.77-2.91 1.77-2.91.1-.21.27-.41.64-.41h1.4c.42 0 .51.21.42.51-.16.74-1.73 3.68-1.72 3.68-.14.22-.19.32 0 .58.14.2.58.57.88.92.55.63.98 1.16 1.09 1.53.12.37-.06.56-.44.56Z"
          />
        </svg>
      );
    case "TELEGRAM":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path
            fill="currentColor"
            d="M21.42 4.59a1.5 1.5 0 0 0-1.59-.22L3.9 10.83c-.81.34-.76 1.51.08 1.77l3.95 1.26 1.5 4.58c.24.75 1.18.97 1.72.41l2.2-2.27 3.98 2.92c.69.5 1.67.12 1.84-.71L21.7 6.02c.11-.52-.06-1.05-.28-1.43ZM9.16 13.3l8.1-5.1c.14-.09.3.1.18.22l-6.69 6.03a.92.92 0 0 0-.28.49l-.45 2.83-.86-2.63a.77.77 0 0 0-.5-.49L6.4 13.9l2.76-.6Z"
          />
        </svg>
      );
  }
}

export function AuthForm({ mode }: { mode: AuthFormMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isLogin = mode === "login";
  const socialProviders = useMemo(
    () =>
      socialProviderOrder.map((provider) => ({
        provider,
        label: socialProviderLabel(provider),
        href: `${API_URL}/api/v1/auth/${socialProviderSlug(provider)}/start`,
      })),
    []
  );

  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) {
      return;
    }

    setMessage(
      authProviderMessage(
        error,
        searchParams.get("provider"),
        searchParams.get("email")
      )
    );
  }, [searchParams]);

  function submit() {
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/auth/${mode}`, {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        });

        if (!response.ok) {
          const error = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(error?.error ?? "auth_failed");
        }

        router.push("/");
        router.refresh();
      } catch (error) {
        setMessage(
          normalizeAuthError(
            error instanceof Error ? error.message : "auth_failed",
            mode
          )
        );
      }
    });
  }

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_90px_rgba(15,23,42,0.45)] backdrop-blur">
      <p className="text-sm font-semibold uppercase tracking-[0.26em] text-fuchsia-300">
        {isLogin ? "Вход" : "Регистрация"}
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-white">
        {isLogin ? "Войти в superava" : "Создать аккаунт"}
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        {isLogin
          ? "Используйте email и пароль, чтобы продолжить работу с профилем и генерациями."
          : "После регистрации вы сразу получите доступ к профилю лица и своим генерациям."}
      </p>

      {message ? (
        <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {message}
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-3 gap-3">
        {socialProviders.map((item) => (
          <a
            key={item.provider}
            href={item.href}
            className="inline-flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-3 py-4 text-center text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-slate-950/60 text-white">
              <SocialProviderIcon provider={item.provider} />
            </span>
            <span>{item.label}</span>
          </a>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-slate-500">
        <div className="h-px flex-1 bg-white/10" />
        <span>Email и пароль</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="mt-5 space-y-3">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          placeholder="you@example.com"
          className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-400/40"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          placeholder="Минимум 6 символов"
          className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-400/40"
        />
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={isPending || !email.trim() || password.length < 6}
        className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-fuchsia-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Подождите..." : isLogin ? "Войти" : "Зарегистрироваться"}
      </button>

      <p className="mt-4 text-sm text-slate-400">
        {isLogin ? "Нет аккаунта? " : "Уже есть аккаунт? "}
        <Link
          href={isLogin ? "/register" : "/login"}
          className="font-medium text-fuchsia-300 transition hover:text-fuchsia-200"
        >
          {isLogin ? "Зарегистрироваться" : "Войти"}
        </Link>
      </p>
      {isLogin ? (
        <p className="mt-2 text-sm text-slate-400">
          <Link
            href="/forgot-password"
            className="font-medium text-fuchsia-300 transition hover:text-fuchsia-200"
          >
            Забыли пароль?
          </Link>
        </p>
      ) : null}
    </div>
  );
}
