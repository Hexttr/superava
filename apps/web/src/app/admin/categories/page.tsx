import Link from "next/link";
import { categoryPreviewUrl } from "@/lib/admin-api";
import { getAdminCategories } from "@/lib/server-api";
import { CreateCategoryButton } from "./create-category-button";

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Категории</h1>
        <CreateCategoryButton />
      </div>
      <div className="mt-6 space-y-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center gap-4 rounded-xl border border-white/10 bg-slate-950/55 p-4"
          >
            {cat.previewKey ? (
              <img
                src={categoryPreviewUrl(cat.id)}
                alt=""
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white/5 text-slate-500">
                —
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium text-white">{cat.name}</p>
              <p className="text-sm text-slate-400">Порядок: {cat.sortOrder}</p>
            </div>
            <Link
              href={`/admin/categories/${cat.id}`}
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
