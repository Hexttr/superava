"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateAdminUserRole, type AdminUser, type UserRole } from "@/lib/admin-api";

export function UserRoleSelect(props: {
  user: AdminUser;
  isCurrentAdmin: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>(props.user.role);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateRole(nextRole: UserRole) {
    setRole(nextRole);
    setMessage(null);

    startTransition(async () => {
      try {
        const updated = await updateAdminUserRole(props.user.id, nextRole);
        setRole(updated.role);
        setMessage("Роль обновлена.");
        router.refresh();
      } catch (error) {
        setRole(props.user.role);
        setMessage(error instanceof Error ? error.message : "Не удалось обновить роль.");
      }
    });
  }

  return (
    <div className="flex min-w-[220px] flex-col items-end gap-2">
      <select
        value={role}
        disabled={isPending}
        onChange={(event) => updateRole(event.currentTarget.value as UserRole)}
        className="rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-400/40 disabled:opacity-70"
      >
        <option value="USER">USER</option>
        <option value="ADMIN">ADMIN</option>
      </select>
      {props.isCurrentAdmin ? (
        <p className="text-xs text-slate-500">Свой аккаунт нельзя понизить из админки.</p>
      ) : null}
      {message ? <p className="text-xs text-slate-400">{message}</p> : null}
    </div>
  );
}
