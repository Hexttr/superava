import {
  apiRoutes,
  createGenerationInputSchema,
  demoGenerations,
  demoGenerationPromptConfig,
  demoPhotoProfile,
  demoTemplates,
  generationPromptConfigSchema,
  generationRecordSchema,
  photoProfileSchema,
  promptConstructorConfigSchema,
  promptTemplateSchema,
  shotTypeSchema,
  type CreateGenerationInput,
  type GenerationPromptConfig,
  type GenerationRecord,
  type PhotoProfile,
  type PromptConstructorConfig,
  type PromptTemplate,
  type ShotType,
} from "@superava/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export function categoryPreviewImageUrl(categoryId: string): string {
  return `${API_URL}/api/v1/categories/${categoryId}/preview`;
}

async function safeFetchJson<T>(
  path: string,
  fallback: T,
  parser: (value: unknown) => T
): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return fallback;
    }

    const json = (await response.json()) as unknown;
    return parser(json);
  } catch {
    return fallback;
  }
}

export async function getProfile(): Promise<PhotoProfile> {
  return safeFetchJson(apiRoutes.profile, demoPhotoProfile, (value) =>
    photoProfileSchema.parse(value)
  );
}

export interface Category {
  id: string;
  name: string;
  previewKey: string | null;
  sortOrder: number;
}

export async function getCategories(): Promise<Category[]> {
  return safeFetchJson("/api/v1/categories", [], (value) => {
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

export async function getTemplates(): Promise<PromptTemplate[]> {
  return safeFetchJson(apiRoutes.templates, demoTemplates, (value) => {
    const parsed = value as { items?: unknown };
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return items.map((item) => promptTemplateSchema.parse(item));
  });
}

export async function getGenerations(): Promise<GenerationRecord[]> {
  return safeFetchJson(apiRoutes.generations, demoGenerations, (value) => {
    const parsed = value as { items?: unknown };
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return items.map((item) => generationRecordSchema.parse(item));
  });
}

export async function getGenerationPromptConfig(): Promise<GenerationPromptConfig> {
  return safeFetchJson(
    apiRoutes.generationPromptConfig,
    demoGenerationPromptConfig,
    (value) => generationPromptConfigSchema.parse(value)
  );
}

export async function getPromptConstructor(): Promise<PromptConstructorConfig | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/config/prompt-constructor`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const json = (await response.json()) as unknown;
    const parsed = json as { parts?: unknown; shortPromptMaxChars?: number; shortPromptMaxWords?: number };
    if (!parsed?.parts || !Array.isArray(parsed.parts) || parsed.parts.length === 0) {
      return null;
    }
    return promptConstructorConfigSchema.parse(json);
  } catch {
    return null;
  }
}

export async function uploadProfileShot(
  shotType: ShotType,
  file: File
): Promise<PhotoProfile> {
  const parsedShotType = shotTypeSchema.parse(shotType);
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/api/v1/profile/shots/${parsedShotType}`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(error?.error ?? "upload_failed");
  }

  const json = (await response.json()) as { profile: unknown };
  return photoProfileSchema.parse(json.profile);
}

export async function createGenerationRequest(
  input: CreateGenerationInput
): Promise<{ accepted: boolean; jobId: string; requestId: string }> {
  const payload = createGenerationInputSchema.parse(input);
  const response = await fetch(`${API_URL}${apiRoutes.generations}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(error?.error ?? "generation_request_failed");
  }

  return (await response.json()) as {
    accepted: boolean;
    jobId: string;
    requestId: string;
  };
}
