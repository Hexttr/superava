import {
  adminUserSchema,
  userRoleSchema,
  userStatusSchema,
  type AdminUser,
  type UserRole,
  type UserStatus,
} from "@superava/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export interface Category {
  id: string;
  name: string;
  previewKey: string | null;
  sortOrder: number;
}

export interface PromptTemplateAdmin {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  group: string;
  previewLabel: string;
  description: string;
  promptSkeleton: string;
  previewKey: string | null;
  categoryId: string | null;
  category?: { id: string; name: string } | null;
}

export interface PromptPart {
  id: string;
  key: string;
  label: string;
  value: string;
  sortOrder: number;
}

export type { AdminUser, UserRole, UserStatus };

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    cache: "no-store",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Admin API error: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function getAdminCategories(): Promise<Category[]> {
  const data = await adminFetch<{ items: Category[] }>("/api/v1/admin/categories");
  return data.items ?? [];
}

export async function createCategory(data: { name: string; sortOrder?: number }): Promise<Category> {
  return adminFetch<Category>("/api/v1/admin/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCategory(
  id: string,
  data: { name?: string; previewKey?: string; sortOrder?: number }
): Promise<Category> {
  return adminFetch<Category>(`/api/v1/admin/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await adminFetch(`/api/v1/admin/categories/${id}`, { method: "DELETE" });
}

export async function uploadCategoryPreview(id: string, file: File): Promise<Category> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/api/v1/admin/categories/${id}/preview`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Upload failed");
  }
  return res.json();
}

export async function getAdminTemplates(): Promise<PromptTemplateAdmin[]> {
  const data = await adminFetch<{ items: PromptTemplateAdmin[] }>("/api/v1/admin/templates");
  return data.items ?? [];
}

export async function createTemplate(data: {
  slug: string;
  title: string;
  subtitle?: string;
  group?: string;
  previewLabel?: string;
  description?: string;
  promptSkeleton?: string;
  categoryId?: string | null;
}): Promise<PromptTemplateAdmin> {
  return adminFetch<PromptTemplateAdmin>("/api/v1/admin/templates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTemplate(
  id: string,
  data: Partial<{
    slug: string;
    title: string;
    subtitle: string;
    group: string;
    previewLabel: string;
    description: string;
    promptSkeleton: string;
    categoryId: string | null;
    previewKey: string;
  }>
): Promise<PromptTemplateAdmin> {
  return adminFetch<PromptTemplateAdmin>(`/api/v1/admin/templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  await adminFetch(`/api/v1/admin/templates/${id}`, { method: "DELETE" });
}

export async function uploadTemplatePreview(id: string, file: File): Promise<PromptTemplateAdmin> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/api/v1/admin/templates/${id}/preview`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Upload failed");
  }
  return res.json();
}

export async function getAdminPromptParts(): Promise<PromptPart[]> {
  const data = (await adminFetch<{ items?: PromptPart[] }>(
    "/api/v1/admin/prompt-parts"
  )) as { items?: PromptPart[] };
  return data.items ?? [];
}

export async function updatePromptPart(
  key: string,
  data: { label?: string; value?: string; sortOrder?: number }
): Promise<PromptPart> {
  return adminFetch<PromptPart>(`/api/v1/admin/prompt-parts/${key}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const data = await adminFetch<{ items?: unknown[] }>("/api/v1/admin/users");
  return (data.items ?? []).map((item) => adminUserSchema.parse(item));
}

export async function updateAdminUserAccess(
  id: string,
  data: {
    role?: UserRole;
    status?: UserStatus;
  }
): Promise<AdminUser> {
  return adminFetch<AdminUser>(`/api/v1/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      role: data.role ? userRoleSchema.parse(data.role) : undefined,
      status: data.status ? userStatusSchema.parse(data.status) : undefined,
    }),
  }).then((item) => adminUserSchema.parse(item));
}

export function categoryPreviewUrl(id: string): string {
  return `${API_URL}/api/v1/categories/${id}/preview`;
}

export function templatePreviewUrl(id: string): string {
  return `${API_URL}/api/v1/templates/${id}/preview`;
}
