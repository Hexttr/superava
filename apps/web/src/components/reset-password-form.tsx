"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export function ResetPasswordForm({ token }: { token?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!token) {
      setMessage("Ссылка для сброса пароля недействительна.");
      return;
    }

    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, password }),
        });

        if (!response.ok) {
          const error = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(error?.error ?? "reset_password_failed");
        }

        router.push("/");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Не удалось обновить пароль.");
      }
    });
  }

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_90px_rgba(15,23,42,0.45)] backdrop-blur">
      <p className="text-sm font-semibold uppercase tracking-[0.26em] text-fuchsia-300">
        Новый пароль
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-white">Задайте новый пароль</h1>
      <p className="mt-2 text-sm text-slate-400">
        После успешного сброса вы автоматически войдёте в аккаунт.
      </p>

      {message ? (
        <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {message}
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
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
        disabled={isPending || password.length < 6 || !token}
        className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-fuchsia-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Сохраняем..." : "Сменить пароль"}
      </button>

      <p className="mt-4 text-sm text-slate-400">
        <Link href="/login" className="font-medium text-fuchsia-300 transition hover:text-fuchsia-200">
          Вернуться ко входу
        </Link>
      </p>
    </div>
  );
}
