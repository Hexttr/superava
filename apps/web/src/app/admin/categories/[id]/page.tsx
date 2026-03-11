import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryPreviewUrl } from "@/lib/admin-api";
import { getAdminCategories } from "@/lib/server-api";
import { CategoryEditForm } from "./category-edit-form";

export default async function AdminCategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const categories = await getAdminCategories();
  const category = categories.find((c) => c.id === id);
  if (!category) notFound();

  return (
    <div>
      <Link href="/admin/categories" className="text-sm text-slate-400 hover:text-white">
        ← Категории
      </Link>
      <div className="mt-4 flex gap-6">
        <div className="shrink-0">
          {category.previewKey ? (
            <img
              src={categoryPreviewUrl(category.id)}
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
          <h1 className="text-2xl font-semibold text-white">{category.name}</h1>
          <CategoryEditForm category={category} />
        </div>
      </div>
    </div>
  );
}
