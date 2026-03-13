"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authProviderMessage } from "@/lib/social-auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";
const TELEGRAM_BOT_NAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME ?? "";

type TelegramAuthPayload = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    SuperavaTelegramAuth?: (payload: TelegramAuthPayload) => void;
  }
}

export function TelegramLoginCard() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [message, setMessage] = useState<string | null>(
    TELEGRAM_BOT_NAME ? null : "Telegram пока не настроен."
  );

  useEffect(() => {
    if (!containerRef.current) return;
    if (!TELEGRAM_BOT_NAME) {
      return;
    }

    window.SuperavaTelegramAuth = async (payload: TelegramAuthPayload) => {
      setMessage(null);
      const response = await fetch(`${API_URL}/api/v1/auth/telegram/verify`, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = (await response.json().catch(() => null)) as
        | { error?: string; redirectTo?: string }
        | null;

      if (!response.ok) {
        setMessage(authProviderMessage(json?.error ?? "telegram_auth_invalid", "telegram"));
        return;
      }

      if (json?.redirectTo) {
        window.location.href = json.redirectTo;
      }
    };

    containerRef.current.innerHTML = "";
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", TELEGRAM_BOT_NAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "999");
    script.setAttribute("data-userpic", "true");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "SuperavaTelegramAuth(user)");
    containerRef.current.appendChild(script);

    return () => {
      delete window.SuperavaTelegramAuth;
    };
  }, []);

  return (
    <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_90px_rgba(15,23,42,0.45)] backdrop-blur">
      <p className="text-sm font-semibold uppercase tracking-[0.26em] text-fuchsia-300">
        Telegram
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-white">Вход через Telegram</h1>
      <p className="mt-2 text-sm text-slate-400">
        Подтвердите вход через Telegram Login Widget. После проверки вы вернетесь в superava.
      </p>

      {message ? (
        <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {message}
        </div>
      ) : null}

      <div className="mt-6 flex justify-center">
        <div ref={containerRef} />
      </div>

      <div className="mt-6 text-center text-sm text-slate-400">
        <Link href="/login" className="text-fuchsia-300 transition hover:text-fuchsia-200">
          Вернуться ко входу
        </Link>
      </div>
    </div>
  );
}
