import {
  apiRoutes,
  authUserSchema,
  generationPromptConfigSchema,
  generationRecordSchema,
  photoProfileSchema,
  promptConstructorConfigSchema,
  promptTemplateSchema,
  type AuthUser,
  type GenerationPromptConfig,
  type GenerationRecord,
  type PhotoProfile,
  type PromptConstructorConfig,
  type PromptTemplate,
} from "@superava/shared";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Category, PromptPart, PromptTemplateAdmin } from "@/lib/admin-api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

async function serverFetch(path: string, init?: RequestInit): Promise<Response> {
  const cookieHeader = (await cookies()).toString();

  return fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...init?.headers,
    },
  });
}

async function parseJson<T>(response: Response, parser: (value: unknown) => T): Promise<T> {
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return parser((await response.json()) as unknown);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await serverFetch("/api/v1/auth/me");

  if (response.status === 401) {
    return null;
  }

  return parseJson(response, (value) => authUserSchema.parse(value));
}

export async function requireAuthUser(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdminUser(): Promise<AuthUser> {
  const user = await requireAuthUser();

  if (user.role !== "ADMIN") {
    redirect("/");
  }

  return user;
}

export async function getProfile(): Promise<PhotoProfile> {
  const response = await serverFetch(apiRoutes.profile);

  if (response.status === 401) {
    redirect("/login");
  }

  return parseJson(response, (value) => photoProfileSchema.parse(value));
}

export async function getTemplates(): Promise<PromptTemplate[]> {
  const response = await serverFetch(apiRoutes.templates);
  return parseJson(response, (value) => {
    const parsed = value as { items?: unknown };
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return items.map((item) => promptTemplateSchema.parse(item));
  });
}

export async function getGenerations(): Promise<GenerationRecord[]> {
  const response = await serverFetch(apiRoutes.generations);

  if (response.status === 401) {
    redirect("/login");
  }

  return parseJson(response, (value) => {
    const parsed = value as { items?: unknown };
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return items.map((item) => generationRecordSchema.parse(item));
  });
}

export async function getGenerationPromptConfig(): Promise<GenerationPromptConfig> {
  const response = await serverFetch(apiRoutes.generationPromptConfig);
  return parseJson(response, (value) => generationPromptConfigSchema.parse(value));
}

export async function getPromptConstructor(): Promise<PromptConstructorConfig | null> {
  const response = await serverFetch("/api/v1/config/prompt-constructor");

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as unknown;
  const parsed = json as {
    parts?: unknown;
    shortPromptMaxChars?: number;
    shortPromptMaxWords?: number;
  };

  if (!Array.isArray(parsed.parts) || parsed.parts.length === 0) {
    return null;
  }

  return promptConstructorConfigSchema.parse(json);
}

export async function getCategories(): Promise<Category[]> {
  const response = await serverFetch("/api/v1/categories");
  return parseJson(response, (value) => {
    const parsed = value as { items?: unknown };
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return items.map((item) => ({
      id: (item as { id?: string }).id ?? "",
      name: (item as { name?: string }).name ?? "",
      previewKey: (item as { previewKey?: string | null }).previewKey ?? null,
      sortOrder: (item as { sortOrder?: number }).sortOrder ?? 0,
    }));
  });
}

export async function getAdminCategories(): Promise<Category[]> {
  const response = await serverFetch("/api/v1/admin/categories");

  if (response.status === 401) {
    redirect("/login");
  }
  if (response.status === 403) {
    redirect("/");
  }

  return parseJson(response, (value) => {
    const parsed = value as { items?: Category[] };
    return parsed.items ?? [];
  });
}

export async function getAdminTemplates(): Promise<PromptTemplateAdmin[]> {
  const response = await serverFetch("/api/v1/admin/templates");

  if (response.status === 401) {
    redirect("/login");
  }
  if (response.status === 403) {
    redirect("/");
  }

  return parseJson(response, (value) => {
    const parsed = value as { items?: PromptTemplateAdmin[] };
    return parsed.items ?? [];
  });
}

export async function getAdminPromptParts(): Promise<PromptPart[]> {
  const response = await serverFetch("/api/v1/admin/prompt-parts");

  if (response.status === 401) {
    redirect("/login");
  }
  if (response.status === 403) {
    redirect("/");
  }

  return parseJson(response, (value) => {
    const parsed = value as { items?: PromptPart[] };
    return parsed.items ?? [];
  });
}
