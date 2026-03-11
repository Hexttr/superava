import Link from "next/link";
import { notFound } from "next/navigation";
import { templatePreviewUrl } from "@/lib/admin-api";
import { getAdminCategories, getAdminTemplates } from "@/lib/server-api";
import { TemplateEditForm } from "./template-edit-form";

export default async function AdminTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [templates, categories] = await Promise.all([
    getAdminTemplates(),
    getAdminCategories(),
  ]);
  const template = templates.find((t) => t.id === id);
  if (!template) notFound();

  return (
    <div>
      <Link href="/admin/templates" className="text-sm text-slate-400 hover:text-white">
        ← Шаблоны
      </Link>
      <div className="mt-4 flex gap-6">
        <div className="shrink-0">
          {template.previewKey ? (
            <img
              src={templatePreviewUrl(template.id)}
              alt=""
              className="h-32 w-32 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-white/5 text-slate-500">
              Нет превью
            </div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-white">{template.title}</h1>
          <p className="text-slate-400">{template.slug}</p>
          <TemplateEditForm template={template} categories={categories} />
        </div>
      </div>
    </div>
  );
}
