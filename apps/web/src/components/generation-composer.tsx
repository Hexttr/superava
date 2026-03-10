"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { PhotoProfile, PromptTemplate } from "@superava/shared";
import { StatusPill } from "@superava/ui";
import { createGenerationRequest } from "@/lib/api";

const BROWSER_KEY_STORAGE = "superava.browserGeminiApiKey";
const BROWSER_MODEL_STORAGE = "superava.browserGeminiModel";

const browserImageModels = [
  "gemini-2.5-flash-image",
  "gemini-3-pro-image-preview",
  "nano-banana-pro-preview",
  "gemini-3.1-flash-image-preview",
] as const;

type BrowserGenerationResult = {
  imageUrl: string | null;
  error: string | null;
  rawResponse: string | null;
  model: string;
};

export function GenerationComposer(props: {
  templates: PromptTemplate[];
  profile: PhotoProfile;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [browserMode, setBrowserMode] = useState(false);
  const [browserApiKey, setBrowserApiKey] = useState("");
  const [browserModel, setBrowserModel] = useState<(typeof browserImageModels)[number]>(
    "gemini-2.5-flash-image"
  );
  const [browserResult, setBrowserResult] = useState<BrowserGenerationResult | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedApiKey = window.localStorage.getItem(BROWSER_KEY_STORAGE);
    const savedModel = window.localStorage.getItem(BROWSER_MODEL_STORAGE);

    if (savedApiKey) {
      setBrowserApiKey(savedApiKey);
    }

    if (
      savedModel &&
      browserImageModels.includes(savedModel as (typeof browserImageModels)[number])
    ) {
      setBrowserModel(savedModel as (typeof browserImageModels)[number]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(BROWSER_KEY_STORAGE, browserApiKey);
  }, [browserApiKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(BROWSER_MODEL_STORAGE, browserModel);
  }, [browserModel]);

  function submitFreePrompt() {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setMessage("Введите запрос.");
      return;
    }

    if (browserMode) {
      submitBrowserPrompt(trimmed);
      return;
    }

    setMessage(null);
    startTransition(async () => {
      try {
        const result = await createGenerationRequest({
          mode: "free",
          prompt: trimmed,
        });
        setPrompt("");
        setMessage(`Генерация запущена: ${result.jobId}`);
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Не удалось запустить генерацию."
        );
      }
    });
  }

  function submitBrowserPrompt(trimmedPrompt: string) {
    if (!browserApiKey.trim()) {
      setMessage("Введите Gemini API key для браузерного теста.");
      return;
    }

    setMessage(null);
    setBrowserResult(null);

    startTransition(async () => {
      try {
        const referenceParts = await Promise.all(
          props.profile.shots
            .filter((shot) => shot.previewUrl)
            .map(async (shot) => {
              const response = await fetch(getShotPreviewSrc(shot), {
                cache: "no-store",
              });

              if (!response.ok) {
                throw new Error(`Не удалось прочитать ракурс ${shot.type}.`);
              }

              const blob = await response.blob();
              const dataUrl = await blobToDataUrl(blob);
              const [header, data] = dataUrl.split(",", 2);
              const mimeType = header.match(/data:(.*?);base64/)?.[1] ?? blob.type ?? "image/jpeg";

              return {
                inlineData: {
                  mimeType,
                  data,
                },
              };
            })
        );

        if (!referenceParts.length) {
          throw new Error("Сначала загрузите хотя бы один ракурс профиля.");
        }

        const payload = {
          contents: [
            {
              parts: [
                {
                  text: [
                    "Create exactly one photorealistic image.",
                    "Preserve the identity from the reference face photos.",
                    "Keep facial proportions, age range, ethnicity, and likeness stable.",
                    trimmedPrompt,
                  ].join(" "),
                },
                ...referenceParts,
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        };

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${browserModel}:generateContent?key=${encodeURIComponent(browserApiKey.trim())}`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const rawText = await response.text();
        const parsed = tryParseJson(rawText);

        if (!response.ok) {
          const errorMessage =
            parsed &&
            typeof parsed === "object" &&
            "error" in parsed &&
            parsed.error &&
            typeof parsed.error === "object" &&
            "message" in parsed.error &&
            typeof parsed.error.message === "string"
              ? parsed.error.message
              : `Gemini вернул ${response.status}.`;

          setBrowserResult({
            imageUrl: null,
            error: errorMessage,
            rawResponse: rawText,
            model: browserModel,
          });
          return;
        }

        const generatedImage = extractImageFromGeminiResponse(parsed);

        if (!generatedImage) {
          setBrowserResult({
            imageUrl: null,
            error: "Gemini не вернул картинку.",
            rawResponse: rawText,
            model: browserModel,
          });
          return;
        }

        setBrowserResult({
          imageUrl: `data:${generatedImage.mimeType};base64,${generatedImage.data}`,
          error: null,
          rawResponse: rawText,
          model: browserModel,
        });
        setMessage("Браузерный тест выполнен.");
      } catch (error) {
        setBrowserResult({
          imageUrl: null,
          error: error instanceof Error ? error.message : "Браузерный тест не удался.",
          rawResponse: null,
          model: browserModel,
        });
      }
    });
  }

  function submitTemplate(templateId: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await createGenerationRequest({
          mode: "template",
          templateId,
        });
        setMessage(`Шаблон запущен: ${result.jobId}`);
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Не удалось запустить шаблон."
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          {message}
        </div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-base font-semibold text-white">Свободный запрос</p>
          <StatusPill
            label={isPending ? "отправка" : browserMode ? "браузер" : "сервер"}
            tone="accent"
          />
        </div>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.currentTarget.value)}
          placeholder="Я на крыше Токио ночью, кинематографично, дорогой свет..."
          className="mt-4 min-h-32 w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
        />
        <label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={browserMode}
            onChange={(event) => setBrowserMode(event.currentTarget.checked)}
            className="h-4 w-4 accent-cyan-400"
          />
          Тестировать Gemini прямо из браузера
        </label>

        {browserMode ? (
          <div className="mt-4 space-y-3 rounded-3xl border border-cyan-400/20 bg-cyan-400/8 p-4">
            <p className="text-sm text-cyan-100">
              Ключ хранится только в этом браузере. Результат не попадет в историю генераций.
            </p>
            <input
              type="password"
              value={browserApiKey}
              onChange={(event) => setBrowserApiKey(event.currentTarget.value)}
              placeholder="Gemini API key"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
            />
            <select
              value={browserModel}
              onChange={(event) =>
                setBrowserModel(event.currentTarget.value as (typeof browserImageModels)[number])
              }
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40"
            >
              {browserImageModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <p className="text-xs leading-5 text-slate-400">
              В тест отправятся все загруженные ракурсы профиля. Это нужно только для локальной
              проверки идеи через твой браузер и VPN.
            </p>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={submitFreePrompt}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {browserMode ? "Тест в браузере" : "Сгенерировать"}
          </button>
          <Link
            href="/generations"
            className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
          >
            Мои генерации
          </Link>
        </div>
      </div>

      {browserMode ? (
        <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-semibold text-white">Результат браузерного теста</p>
            <StatusPill
              label={browserResult?.model ?? browserModel}
              tone={browserResult?.imageUrl ? "success" : "accent"}
            />
          </div>

          {browserResult?.imageUrl ? (
            <Image
              src={browserResult.imageUrl}
              alt="Browser generation result"
              width={1024}
              height={1024}
              unoptimized
              className="mt-4 aspect-square w-full rounded-[1.75rem] border border-white/10 object-cover"
            />
          ) : (
            <div className="mt-4 flex aspect-square w-full items-center justify-center rounded-[1.75rem] border border-dashed border-white/10 bg-white/5 text-sm text-slate-500">
              Здесь появится картинка или ошибка Gemini.
            </div>
          )}

          {browserResult?.error ? (
            <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {browserResult.error}
            </div>
          ) : null}

          {browserResult?.rawResponse ? (
            <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-slate-300">
              {browserResult.rawResponse}
            </pre>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3">
        {props.templates.map((template) => (
          <div
            key={template.id}
            className="rounded-3xl border border-white/10 bg-slate-950/55 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-white">
                  {template.title}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {template.subtitle}
                </p>
              </div>
              <StatusPill label={template.previewLabel} tone="accent" />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {template.description}
            </p>
            <div className="mt-4">
              <button
                type="button"
                disabled={isPending}
                onClick={() => submitTemplate(template.id)}
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Выбрать
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getShotPreviewSrc(shot: PhotoProfile["shots"][number]) {
  if (!shot.previewUrl) {
    return `/api/shot-reference/${shot.type}?size=512`;
  }

  const version = shot.previewVersion
    ? `?v=${encodeURIComponent(shot.previewVersion)}`
    : "";
  return `/api/profile-preview/${shot.type}${version}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Не удалось прочитать изображение."));
        return;
      }

      resolve(reader.result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Не удалось прочитать изображение."));
    reader.readAsDataURL(blob);
  });
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function extractImageFromGeminiResponse(
  value: unknown
): { data: string; mimeType: string } | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidates =
    "candidates" in value && Array.isArray(value.candidates) ? value.candidates : [];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const content =
      "content" in candidate && candidate.content && typeof candidate.content === "object"
        ? candidate.content
        : null;
    const parts =
      content && "parts" in content && Array.isArray(content.parts) ? content.parts : [];

    for (const part of parts) {
      if (!part || typeof part !== "object") {
        continue;
      }

      const inlineData =
        "inlineData" in part && part.inlineData && typeof part.inlineData === "object"
          ? part.inlineData
          : null;

      if (
        inlineData &&
        "data" in inlineData &&
        typeof inlineData.data === "string" &&
        "mimeType" in inlineData &&
        typeof inlineData.mimeType === "string"
      ) {
        return {
          data: inlineData.data,
          mimeType: inlineData.mimeType,
        };
      }
    }
  }

  return null;
}
