"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export function ResendVerificationButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resend() {
    setMessage(null);
    setDebugUrl(null);

    startTransition(async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/auth/resend-verification`, {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          const error = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(error?.error ?? "resend_verification_failed");
        }

        const json = (await response.json()) as { debugVerifyUrl?: string };
        setMessage("Письмо для подтверждения отправлено.");
        setDebugUrl(json.debugVerifyUrl ?? null);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Не удалось отправить письмо.");
      }
    });
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={resend}
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/15 disabled:opacity-70"
      >
        {isPending ? "Отправляем..." : "Отправить письмо ещё раз"}
      </button>
      {message ? <p className="mt-2 text-xs text-slate-300">{message}</p> : null}
      {debugUrl ? <p className="mt-1 break-all text-xs text-slate-400">{debugUrl}</p> : null}
    </div>
  );
}
