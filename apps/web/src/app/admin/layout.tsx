import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { requireAdminUser } from "@/lib/server-api";

const navItems = [
  { href: "/admin", label: "Дашборд" },
  { href: "/admin/categories", label: "Категории" },
  { href: "/admin/templates", label: "Готовые промпты" },
  { href: "/admin/prompts", label: "Промпты (конструктор)" },
];
const navPlaceholders = [
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/billing", label: "Биллинг" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminUser();

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-white/10 bg-slate-950/80">
        <div className="sticky top-0 flex flex-col gap-1 p-4">
          <Link
            href="/admin"
            className="mb-4 text-lg font-semibold text-white"
          >
            Админка
          </Link>
          <p className="mb-3 text-xs text-slate-500">{user.email ?? user.name ?? "admin"}</p>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
          <div className="my-2 h-px bg-white/10" />
          {navPlaceholders.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-slate-500 transition hover:bg-white/5 hover:text-slate-400"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-4">
            <LogoutButton
              redirectTo="/login"
              className="inline-flex w-full items-center justify-center rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/6 disabled:opacity-70"
            />
          </div>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
