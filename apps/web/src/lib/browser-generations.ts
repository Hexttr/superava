import type { GenerationRecord } from "@superava/shared";

export type BrowserGenerationRecord = GenerationRecord & {
  imageDataUrl?: string;
  source: "browser";
};

const BROWSER_GENERATIONS_STORAGE_KEY = "superava.browserGenerations";
export const BROWSER_GENERATIONS_UPDATED_EVENT = "superava-browser-generations-updated";

export function listBrowserGenerations(): BrowserGenerationRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(BROWSER_GENERATIONS_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isBrowserGenerationRecord).map(withBillingDefaults);
  } catch {
    return [];
  }
}

export function saveBrowserGeneration(generation: BrowserGenerationRecord) {
  if (typeof window === "undefined") {
    return;
  }

  const next = [generation, ...listBrowserGenerations()]
    .filter((item, index, array) => array.findIndex((entry) => entry.id === item.id) === index)
    .slice(0, 24);

  window.localStorage.setItem(BROWSER_GENERATIONS_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(BROWSER_GENERATIONS_UPDATED_EVENT));
}

function isBrowserGenerationRecord(value: unknown): value is BrowserGenerationRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<BrowserGenerationRecord>;

  return (
    typeof candidate.id === "string" &&
    (candidate.mode === "free" || candidate.mode === "template") &&
    ["queued", "processing", "finalizing", "completed", "failed"].includes(
      candidate.status ?? ""
    ) &&
    typeof candidate.title === "string" &&
    typeof candidate.subtitle === "string" &&
    typeof candidate.createdAt === "string"
  );
}

function withBillingDefaults(
  generation: Omit<BrowserGenerationRecord, "billingStatus" | "priceMinor" | "currency"> &
    Partial<Pick<BrowserGenerationRecord, "billingStatus" | "priceMinor" | "currency">>
): BrowserGenerationRecord {
  return {
    ...generation,
    billingStatus: generation.billingStatus ?? "NONE",
    priceMinor: generation.priceMinor ?? 0,
    currency: generation.currency ?? "RUB",
  };
}
