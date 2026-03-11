import { requireAdminUser, getAdminUsers } from "@/lib/server-api";
import { UserAccessControls } from "./user-role-select";

export default async function AdminUsersPage() {
  const [admin, users] = await Promise.all([requireAdminUser(), getAdminUsers()]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Пользователи</h1>
      <p className="mt-2 text-slate-400">
        Управление ролями и статусами. `BLOCKED` немедленно режет новые сессии и вход в аккаунт.
      </p>
      <div className="mt-6 space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex flex-col gap-4 rounded-xl border border-white/10 bg-slate-950/55 p-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="font-medium text-white">{user.email ?? user.name ?? user.id}</p>
              <p className="mt-1 text-sm text-slate-400">
                {user.name ? `${user.name} · ` : ""}
                {user.emailVerified ? "email verified" : "email not verified"} · {user.status} · создан{" "}
                {new Date(user.createdAt).toLocaleString("ru-RU")}
              </p>
            </div>
            <UserAccessControls user={user} isCurrentAdmin={user.id === admin.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
