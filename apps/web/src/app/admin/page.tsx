import Link from "next/link";
import { getAdminUsers } from "@/lib/server-api";

export default async function AdminDashboardPage() {
  const users = await getAdminUsers();
  const adminCount = users.filter((user) => user.role === "ADMIN").length;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Дашборд</h1>
      <p className="mt-2 text-slate-400">
        MVP админки. Здесь будут сводки по пользователям и биллингу.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/categories"
          className="rounded-xl border border-white/10 bg-slate-950/55 p-4 transition hover:border-cyan-400/30"
        >
          <p className="font-medium text-white">Категории</p>
          <p className="mt-1 text-sm text-slate-400">
            Управление категориями шаблонов
          </p>
        </Link>
        <Link
          href="/admin/templates"
          className="rounded-xl border border-white/10 bg-slate-950/55 p-4 transition hover:border-cyan-400/30"
        >
          <p className="font-medium text-white">Готовые промпты</p>
          <p className="mt-1 text-sm text-slate-400">
            Шаблоны для генерации
          </p>
        </Link>
        <Link
          href="/admin/prompts"
          className="rounded-xl border border-white/10 bg-slate-950/55 p-4 transition hover:border-cyan-400/30"
        >
          <p className="font-medium text-white">Промпты (конструктор)</p>
          <p className="mt-1 text-sm text-slate-400">
            Части конструктора промптов
          </p>
        </Link>
        <Link
          href="/admin/users"
          className="rounded-xl border border-white/10 bg-slate-950/55 p-4 transition hover:border-cyan-400/30"
        >
          <p className="font-medium text-white">Пользователи</p>
          <p className="mt-1 text-sm text-slate-400">
            {users.length} всего · {adminCount} админов
          </p>
        </Link>
        <div className="rounded-xl border border-white/5 bg-slate-950/30 p-4 opacity-75">
          <p className="font-medium text-slate-400">Биллинг</p>
          <p className="mt-1 text-sm text-slate-500">Скоро</p>
        </div>
      </div>
    </div>
  );
}
