"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export function VerifyEmailCard({ token }: { token?: string }) {
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Подтверждаем email...");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("Ссылка подтверждения недействительна.");
      return;
    }

    void (async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/auth/verify-email`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const error = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(error?.error ?? "verify_email_failed");
        }

        setState("success");
        setMessage("Email успешно подтверждён.");
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "Не удалось подтвердить email.");
      }
    })();
  }, [token]);

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_90px_rgba(15,23,42,0.45)] backdrop-blur">
      <p className="text-sm font-semibold uppercase tracking-[0.26em] text-fuchsia-300">
        Email
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-white">Подтверждение email</h1>
      <div
        className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
          state === "success"
            ? "border border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
            : state === "error"
              ? "border border-rose-400/20 bg-rose-400/10 text-rose-100"
              : "border border-white/10 bg-slate-950/55 text-slate-200"
        }`}
      >
        {message}
      </div>
      <p className="mt-4 text-sm text-slate-400">
        <Link href="/login" className="font-medium text-fuchsia-300 transition hover:text-fuchsia-200">
          Перейти ко входу
        </Link>
      </p>
    </div>
  );
}
