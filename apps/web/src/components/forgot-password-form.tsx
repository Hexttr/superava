"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setMessage(null);
    setDebugUrl(null);

    startTransition(async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });

        if (!response.ok) {
          const error = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(error?.error ?? "forgot_password_failed");
        }

        const json = (await response.json()) as { debugResetUrl?: string };
        setMessage("Если аккаунт существует, мы отправили ссылку для сброса пароля.");
        setDebugUrl(json.debugResetUrl ?? null);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Не удалось отправить ссылку.");
      }
    });
  }

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_90px_rgba(15,23,42,0.45)] backdrop-blur">
      <p className="text-sm font-semibold uppercase tracking-[0.26em] text-fuchsia-300">
        Восстановление
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-white">Сброс пароля</h1>
      <p className="mt-2 text-sm text-slate-400">
        Введите email, и мы отправим ссылку для установки нового пароля.
      </p>

      {message ? (
        <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          {message}
          {debugUrl ? (
            <div className="mt-2 break-all">
              <Link href={debugUrl} className="font-medium text-cyan-200 underline">
                {debugUrl}
              </Link>
            </div>
          ) : null}
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
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={isPending || !email.trim()}
        className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-fuchsia-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Отправляем..." : "Отправить ссылку"}
      </button>

      <p className="mt-4 text-sm text-slate-400">
        <Link href="/login" className="font-medium text-fuchsia-300 transition hover:text-fuchsia-200">
          Вернуться ко входу
        </Link>
      </p>
    </div>
  );
}
