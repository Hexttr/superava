import Link from "next/link";
import { getAdminCategories, getAdminTemplates } from "@/lib/admin-api";
import { templatePreviewUrl } from "@/lib/admin-api";
import { CreateTemplateButton } from "./create-template-button";

export default async function AdminTemplatesPage() {
  const [templates, categories] = await Promise.all([
    getAdminTemplates(),
    getAdminCategories(),
  ]);
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Готовые промпты (шаблоны)</h1>
        <CreateTemplateButton categories={categories} />
      </div>
      <div className="mt-6 space-y-3">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="flex items-center gap-4 rounded-xl border border-white/10 bg-slate-950/55 p-4"
          >
            {tpl.previewKey ? (
              <img
                src={templatePreviewUrl(tpl.id)}
                alt=""
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white/5 text-slate-500">
                —
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium text-white">{tpl.title}</p>
              <p className="text-sm text-slate-400">
                {tpl.slug} · {tpl.categoryId ? categoryMap.get(tpl.categoryId) ?? "—" : "—"}
              </p>
            </div>
            <Link
              href={`/admin/templates/${tpl.id}`}
              className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white transition hover:bg-white/5"
            >
              Редактировать
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
