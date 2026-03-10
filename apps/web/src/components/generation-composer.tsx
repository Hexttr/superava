"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  buildGenerationPrompt,
  normalizeGeminiErrorMessage,
  type GenerationPromptConfig,
  type PhotoProfile,
  type PromptTemplate,
} from "@superava/shared";
import { StatusPill } from "@superava/ui";
import { createGenerationRequest } from "@/lib/api";
import { saveBrowserGeneration } from "@/lib/browser-generations";

const browserApiKey = process.env.NEXT_PUBLIC_GEMINI_BROWSER_KEY?.trim() ?? "";
const browserModel =
  process.env.NEXT_PUBLIC_GEMINI_BROWSER_MODEL?.trim() ?? "gemini-2.5-flash-image";
const generationTransport = process.env.NEXT_PUBLIC_GEMINI_TRANSPORT?.trim() ?? "server";
const browserTransportEnabled = generationTransport === "browser" && Boolean(browserApiKey);

export function GenerationComposer(props: {
  templates: PromptTemplate[];
  profile: PhotoProfile;
  generationPromptConfig: GenerationPromptConfig;
  showTemplates?: boolean;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitFreePrompt() {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setMessage("Введите запрос.");
      return;
    }

    if (browserTransportEnabled) {
      submitBrowserPrompt({
        prompt: trimmed,
        title: trimmed,
        mode: "free",
      });
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

  function submitBrowserPrompt(args: {
    prompt: string;
    title: string;
    mode: "free" | "template";
    template?: PromptTemplate;
  }) {
    setMessage(null);

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
                  text: buildGenerationPrompt({
                    input: {
                      mode: args.mode,
                      prompt: args.prompt,
                    },
                    profile: props.profile,
                    config: props.generationPromptConfig,
                    template: args.template,
                  }),
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
          `https://generativelanguage.googleapis.com/v1beta/models/${browserModel}:generateContent?key=${encodeURIComponent(browserApiKey)}`,
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
          const rawErrorMessage =
            parsed &&
            typeof parsed === "object" &&
            "error" in parsed &&
            parsed.error &&
            typeof parsed.error === "object" &&
            "message" in parsed.error &&
            typeof parsed.error.message === "string"
              ? parsed.error.message
              : `Gemini вернул ${response.status}.`;
          const errorMessage = normalizeGeminiErrorMessage(rawErrorMessage);

          saveBrowserGeneration({
            id: `browser-${crypto.randomUUID()}`,
            mode: args.mode,
            status: "failed",
            title: args.title,
            subtitle: errorMessage,
            createdAt: new Date().toISOString(),
            source: "browser",
          });
          setMessage(errorMessage);
          return;
        }

        const generatedImage = extractImageFromGeminiResponse(parsed);

        if (!generatedImage) {
          saveBrowserGeneration({
            id: `browser-${crypto.randomUUID()}`,
            mode: args.mode,
            status: "failed",
            title: args.title,
            subtitle: "Gemini не вернул картинку.",
            createdAt: new Date().toISOString(),
            source: "browser",
          });
          setMessage("Gemini не вернул картинку.");
          return;
        }

        saveBrowserGeneration({
          id: `browser-${crypto.randomUUID()}`,
          mode: args.mode,
          status: "completed",
          title: args.title,
          subtitle: "Готово",
          createdAt: new Date().toISOString(),
          imageDataUrl: `data:${generatedImage.mimeType};base64,${generatedImage.data}`,
          source: "browser",
        });
        setPrompt("");
        setMessage("Генерация добавлена в мои генерации.");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Браузерная генерация не удалась.";

        saveBrowserGeneration({
          id: `browser-${crypto.randomUUID()}`,
          mode: args.mode,
          status: "failed",
          title: args.title,
          subtitle: errorMessage,
          createdAt: new Date().toISOString(),
          source: "browser",
        });
        setMessage(errorMessage);
      }
    });
  }

  function submitTemplate(template: PromptTemplate) {
    if (browserTransportEnabled) {
      submitBrowserPrompt({
        mode: "template",
        title: template.title,
        prompt: template.promptSkeleton,
        template,
      });
      return;
    }

    setMessage(null);
    startTransition(async () => {
      try {
        const result = await createGenerationRequest({
          mode: "template",
          templateId: template.id,
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

      <div className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-white">Опишите кадр</p>
            <p className="mt-1 text-sm text-slate-400">
              Лицо возьмем из вашего профиля, а сцену соберем по описанию.
            </p>
          </div>
          <StatusPill
            label={isPending ? "запуск" : browserTransportEnabled ? "preview" : "server"}
            tone="accent"
          />
        </div>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.currentTarget.value)}
          placeholder="Я на крыше Токио ночью, кинематографично, реалистично, дорогой свет..."
          className="mt-4 min-h-36 w-full rounded-[1.75rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={submitFreePrompt}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Сгенерировать
          </button>
          <Link
            href="/generations"
            className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
          >
            Мои генерации
          </Link>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          {browserTransportEnabled
            ? `Сейчас используется браузерный preview-маршрут через ${browserModel}.`
            : "Сейчас используется серверный маршрут генерации через API и worker."}
        </p>
      </div>

      {props.showTemplates !== false ? (
        <div className="grid gap-3">
          {props.templates.map((template) => (
            <div
              key={template.id}
              className="rounded-3xl border border-white/10 bg-slate-950/55 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{template.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{template.subtitle}</p>
                </div>
                <StatusPill label={template.previewLabel} tone="accent" />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{template.description}</p>
              <div className="mt-4">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => submitTemplate(template)}
                  className="inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Выбрать
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
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
