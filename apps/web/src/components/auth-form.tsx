"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
      return message || "Произошла ошибка. Попробуйте еще раз.";
  }
}

export function AuthForm({ mode }: { mode: AuthFormMode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isLogin = mode === "login";

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
