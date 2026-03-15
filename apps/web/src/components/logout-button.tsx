"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LogoutCrossIcon } from "@/components/ui-icons";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export function LogoutButton(props: {
  className?: string;
  redirectTo?: string;
  label?: string;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function logout() {
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/auth/logout`, {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("logout_failed");
        }

        router.push(props.redirectTo ?? "/login");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Не удалось выйти.");
      }
    });
  }

  const defaultClassName =
    "inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/6 disabled:opacity-70";
  const iconOnlyClassName =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent p-0 text-rose-400 transition hover:bg-rose-400/15 hover:text-rose-300 disabled:opacity-70";

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={logout}
        disabled={isPending}
        title={props.iconOnly ? "Выйти" : undefined}
        className={props.iconOnly ? iconOnlyClassName : props.className ?? defaultClassName}
      >
        {props.iconOnly ? (
          <LogoutCrossIcon className="h-5 w-5" />
        ) : isPending ? (
          "Выходим..."
        ) : (
          props.label ?? "Выйти"
        )}
      </button>
      {message ? <p className="text-xs text-rose-300">{message}</p> : null}
    </div>
  );
}
