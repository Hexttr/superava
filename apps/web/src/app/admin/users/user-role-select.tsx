"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  updateAdminUserAccess,
  type AdminUser,
  type UserRole,
  type UserStatus,
} from "@/lib/admin-api";

export function UserAccessControls(props: {
  user: AdminUser;
  isCurrentAdmin: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>(props.user.role);
  const [status, setStatus] = useState<UserStatus>(props.user.status);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateAccess(next: { role?: UserRole; status?: UserStatus }) {
    const nextRole = next.role ?? role;
    const nextStatus = next.status ?? status;
    setRole(nextRole);
    setStatus(nextStatus);
    setMessage(null);

    startTransition(async () => {
      try {
        const updated = await updateAdminUserAccess(props.user.id, next);
        setRole(updated.role);
        setStatus(updated.status);
        setMessage("Доступ обновлён.");
        router.refresh();
      } catch (error) {
        setRole(props.user.role);
        setStatus(props.user.status);
        setMessage(error instanceof Error ? error.message : "Не удалось обновить доступ.");
      }
    });
  }

  return (
    <div className="flex min-w-[220px] flex-col items-end gap-2">
      <select
        value={role}
        disabled={isPending}
        onChange={(event) => updateAccess({ role: event.currentTarget.value as UserRole })}
        className="rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-400/40 disabled:opacity-70"
      >
        <option value="USER">USER</option>
        <option value="ADMIN">ADMIN</option>
      </select>
      <select
        value={status}
        disabled={isPending}
        onChange={(event) => updateAccess({ status: event.currentTarget.value as UserStatus })}
        className="rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-400/40 disabled:opacity-70"
      >
        <option value="ACTIVE">ACTIVE</option>
        <option value="BLOCKED">BLOCKED</option>
      </select>
      {props.isCurrentAdmin ? (
        <p className="text-xs text-slate-500">
          Свой аккаунт нельзя понизить или заблокировать из админки.
        </p>
      ) : null}
      {message ? <p className="text-xs text-slate-400">{message}</p> : null}
    </div>
  );
}
