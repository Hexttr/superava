"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  buildGenerationPrompt,
  normalizeGeminiErrorMessage,
  type GenerationPromptConfig,
  type PhotoProfile,
  type PromptConstructorConfig,
  type PromptTemplate,
} from "@superava/shared";
import { StatusPill } from "@superava/ui";
import { createGenerationRequest, uploadReferencePhoto } from "@/lib/api";
import { saveBrowserGeneration } from "@/lib/browser-generations";

const browserApiKey = process.env.NEXT_PUBLIC_GEMINI_BROWSER_KEY?.trim() ?? "";
const browserModel =
  process.env.NEXT_PUBLIC_GEMINI_BROWSER_MODEL?.trim() ?? "gemini-2.5-flash-image";
const generationTransport = process.env.NEXT_PUBLIC_GEMINI_TRANSPORT?.trim() ?? "server";
const browserTransportEnabled =
  process.env.NODE_ENV !== "production" &&
  generationTransport === "browser" &&
  Boolean(browserApiKey);

function formatRub(minor: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export function GenerationComposer(props: {
  templates: PromptTemplate[];
  profile: PhotoProfile;
  generationPromptConfig: GenerationPromptConfig;
  promptConstructor?: PromptConstructorConfig;
  showTemplates?: boolean;
  mode?: "prompt" | "reference" | "full";
  onBack?: () => void;
}) {
  const router = useRouter();
  const referenceInputRef = useRef<HTMLInputElement | null>(null);
  const [prompt, setPrompt] = useState("");
  const [referencePhoto, setReferencePhoto] = useState<File | null>(null);
  const [enhancePortrait, setEnhancePortrait] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "accent" | "success" | "warning" } | null>(null);
  const [showEnhanceInfo, setShowEnhanceInfo] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isPromptOnly = props.mode === "prompt";
  const isReferenceOnly = props.mode === "reference";
  const isCompactMode = props.showTemplates === false && (isPromptOnly || isReferenceOnly);
  const readyShots = props.profile.shots.filter((shot) => shot.status !== "missing").length;
  const profileReady = props.profile.completionPercent >= 100;
  const canRunReference = Boolean(referencePhoto);
  const canRunPrompt = Boolean(prompt.trim());
  const canSubmitCompact = isReferenceOnly ? Boolean(prompt.trim() || referencePhoto) : canRunPrompt;
  const referencePreviewUrl = referencePhoto ? URL.createObjectURL(referencePhoto) : null;

  function submitFreePrompt() {
    const trimmed = prompt.trim();
    const hasReference = Boolean(referencePhoto);

    if (!trimmed && !hasReference) {
      setMessage({
        text: isReferenceOnly
          ? "Добавьте описание сцены или приложите фото."
          : "Опишите сцену словами.",
        tone: "warning",
      });
      return;
    }

    if ((!isPromptOnly && hasReference) || (isReferenceOnly && hasReference)) {
      submitReferencePhoto();
      return;
    }

    if (browserTransportEnabled) {
      submitBrowserPrompt({
        prompt: trimmed,
        title: trimmed,
        mode: "free",
        enhancePortrait,
      });
      return;
    }

    setMessage(null);
    startTransition(async () => {
      try {
        const result = await createGenerationRequest({
          mode: "free",
          prompt: trimmed,
          enhancePortrait,
        });
        setPrompt("");
        setMessage({
          text: `Генерация запущена. Запрос ${result.jobId} появился в истории.`,
          tone: "success",
        });
        router.refresh();
      } catch (error) {
        setMessage({
          text: normalizeGenerationLaunchError(error),
          tone: "warning",
        });
      }
    });
  }

  function submitReferencePhoto() {
    if (!referencePhoto) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const { storageKey } = await uploadReferencePhoto(referencePhoto);
        const result = await createGenerationRequest({
          mode: "reference",
          referencePhotoKey: storageKey,
          prompt: prompt.trim() || undefined,
          enhancePortrait,
        });
        setReferencePhoto(null);
        setPrompt("");
        setMessage({
          text: `Генерация по фото запущена. Запрос ${result.jobId} уже в работе.`,
          tone: "success",
        });
        router.refresh();
      } catch (error) {
        setMessage({
          text: normalizeGenerationLaunchError(error),
          tone: "warning",
        });
      }
    });
  }

  function submitBrowserPrompt(args: {
    prompt: string;
    title: string;
    mode: "free" | "template";
    template?: PromptTemplate;
    enhancePortrait?: boolean;
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
                      enhancePortrait: args.enhancePortrait ?? false,
                    },
                    profile: props.profile,
                    config: props.generationPromptConfig,
                    template: args.template,
                    promptConstructor: props.promptConstructor,
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
            billingStatus: "NONE",
            priceMinor: 0,
            currency: "RUB",
            title: args.title,
            subtitle: errorMessage,
            createdAt: new Date().toISOString(),
            source: "browser",
          });
          setMessage({ text: errorMessage, tone: "warning" });
          return;
        }

        const generatedImage = extractImageFromGeminiResponse(parsed);

        if (!generatedImage) {
          saveBrowserGeneration({
            id: `browser-${crypto.randomUUID()}`,
            mode: args.mode,
            status: "failed",
            billingStatus: "NONE",
            priceMinor: 0,
            currency: "RUB",
            title: args.title,
            subtitle: "Gemini не вернул картинку.",
            createdAt: new Date().toISOString(),
            source: "browser",
          });
          setMessage({ text: "Gemini не вернул картинку.", tone: "warning" });
          return;
        }

        saveBrowserGeneration({
          id: `browser-${crypto.randomUUID()}`,
          mode: args.mode,
          status: "completed",
          billingStatus: "NONE",
          priceMinor: 0,
          currency: "RUB",
          title: args.title,
          subtitle: "Готово",
          createdAt: new Date().toISOString(),
          imageDataUrl: `data:${generatedImage.mimeType};base64,${generatedImage.data}`,
          source: "browser",
        });
        setPrompt("");
        setMessage({
          text: "Локальная dev-генерация добавлена в историю результатов.",
          tone: "success",
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Браузерная генерация не удалась.";

        saveBrowserGeneration({
          id: `browser-${crypto.randomUUID()}`,
          mode: args.mode,
          status: "failed",
          billingStatus: "NONE",
          priceMinor: 0,
          currency: "RUB",
          title: args.title,
          subtitle: errorMessage,
          createdAt: new Date().toISOString(),
          source: "browser",
        });
        setMessage({ text: errorMessage, tone: "warning" });
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
        enhancePortrait,
      });
      return;
    }

    setMessage(null);
    startTransition(async () => {
      try {
        await createGenerationRequest({
          mode: "template",
          templateId: template.id,
          enhancePortrait,
        });
        setMessage({
          text: `Шаблон "${template.title}" отправлен в генерацию.`,
          tone: "success",
        });
        router.refresh();
      } catch (error) {
        setMessage({
          text: normalizeGenerationLaunchError(error),
          tone: "warning",
        });
      }
    });
  }

  if (isCompactMode) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Опишите идеальный кадр</p>
            <p className="mt-1 text-sm text-slate-400">
              {isReferenceOnly
                ? "Можно добавить фото, если хотите задать композицию или настроение."
                : "Опишите сцену кратко и ясно: локация, свет, стиль, настроение."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => props.onBack?.()}
            className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/8"
          >
            Назад
          </button>
        </div>

        {message ? (
          <div
            className={`rounded-[1.5rem] border px-4 py-3 text-sm ${
              message.tone === "success"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                : message.tone === "warning"
                  ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
                  : "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-100"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <div className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.78)_0%,rgba(9,9,15,0.92)_100%)] p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
                <button
                  type="button"
                  onClick={() => setEnhancePortrait(false)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    !enhancePortrait
                      ? "bg-white text-slate-950 shadow-[0_8px_30px_rgba(255,255,255,0.15)]"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Реальный вид
                </button>
                <button
                  type="button"
                  onClick={() => setEnhancePortrait(true)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    enhancePortrait
                      ? "bg-fuchsia-500 text-white shadow-[0_8px_30px_rgba(217,70,239,0.25)]"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Улучшенный вид
                </button>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEnhanceInfo((value) => !value)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-slate-300 transition hover:bg-white/8 hover:text-white"
                  aria-label="Что означает переключатель вида"
                >
                  <QuestionIcon />
                </button>
                {showEnhanceInfo ? (
                  <div className="absolute right-0 top-11 z-10 w-72 rounded-[1.1rem] border border-white/10 bg-slate-950/95 p-3 text-sm leading-6 text-slate-300 shadow-[0_18px_60px_rgba(2,6,23,0.4)]">
                    Реальный вид ближе к естественной фотографии. Улучшенный вид делает свет, кожу
                    и подачу чуть более polished.
                  </div>
                ) : null}
              </div>
            </div>

            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.currentTarget.value)}
              placeholder={
                isReferenceOnly
                  ? "Например: я в современном кафе с мягким вечерним светом, fashion portrait, спокойный взгляд..."
                  : "Например: я на крыше Токио ночью, cinematic editorial, неон, дорогой свет..."
              }
              className="min-h-36 w-full rounded-[1.6rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-400/35"
            />

            {isReferenceOnly ? (
              <div className="space-y-3">
                <input
                  ref={referenceInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => setReferencePhoto(event.currentTarget.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => referenceInputRef.current?.click()}
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/6"
                >
                  {referencePhoto ? "Заменить файл" : "Приложить файл"}
                </button>
                {referencePhoto && referencePreviewUrl ? (
                  <div className="flex items-center gap-3 rounded-[1.3rem] border border-white/10 bg-white/[0.03] p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={referencePreviewUrl}
                      alt={referencePhoto.name}
                      className="h-14 w-14 rounded-[1rem] object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{referencePhoto.name}</p>
                      <p className="mt-1 text-xs text-slate-400">Файл поможет задать сцену и композицию.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReferencePhoto(null)}
                      className="text-sm font-medium text-rose-300 transition hover:text-rose-200"
                    >
                      Убрать
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={submitFreePrompt}
                disabled={isPending || !canSubmitCompact}
                className="inline-flex items-center justify-center rounded-full bg-fuchsia-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? "Запускаем..." : "Запустить генерацию"}
              </button>
              <Link
                href="/generations"
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/6"
              >
                История генераций
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {message ? (
        <div
          className={`rounded-[1.5rem] border px-4 py-3 text-sm ${
            message.tone === "success"
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
              : message.tone === "warning"
                ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
                : "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-100"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <p className="text-base font-semibold text-white">
                {isReferenceOnly ? "Загрузите кадр-референс" : "Опишите идеальный кадр"}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                {isReferenceOnly
                  ? "Загрузите фото с одной сценой. Мы разберем композицию, свет и настроение, а затем соберем похожий кадр уже с вашим лицом."
                  : "Лицо берем из собранного профиля, а сцену, настроение и стиль строим по вашему описанию или выбранному шаблону."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                label={profileReady ? "Профиль готов" : `${readyShots}/6 ракурсов`}
                tone={profileReady ? "success" : "warning"}
              />
              {browserTransportEnabled ? <StatusPill label="dev browser mode" tone="neutral" /> : null}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <InfoCard
              title="1. Лицо"
              text="Собранный профиль помогает удерживать сходство, пропорции и посадку лица."
            />
            <InfoCard
              title="2. Сцена"
              text={
                isReferenceOnly
                  ? "Используем композицию и свет из референс-кадра."
                  : "Чем понятнее вы опишете сцену, тем чище получится композиция."
              }
            />
            <InfoCard
              title="3. Финал"
              text="Результат появится в истории генераций. Активные статусы обновляются автоматически."
            />
          </div>

          {!isReferenceOnly && (
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.currentTarget.value)}
              placeholder="Я на крыше Токио ночью, editorial fashion, мягкий неон, дорогой свет, реалистичная фотография..."
              className="mt-4 min-h-40 w-full rounded-[1.75rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-400/40"
            />
          )}

          {(isReferenceOnly || !isPromptOnly) && (
            <div className="mt-4 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4">
              <label className="flex cursor-pointer flex-col gap-2 text-sm text-slate-300">
                <span className="font-medium text-white">
                  {isReferenceOnly ? "Добавьте фото-референс" : "Или загрузите фото-референс"}
                </span>
                <span className="text-slate-400">
                  На фото должен быть один человек и понятная сцена без сильных фильтров.
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReferencePhoto(e.target.files?.[0] ?? null)}
                  className="text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-fuchsia-500/20 file:px-4 file:py-2 file:font-medium file:text-fuchsia-200 file:transition file:hover:bg-fuchsia-500/30"
                />
              </label>
              {referencePreviewUrl ? (
                <div className="mt-4 flex items-center gap-3 rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={referencePreviewUrl}
                    alt={referencePhoto?.name ?? "reference"}
                    className="h-20 w-20 rounded-[1.2rem] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {referencePhoto?.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Этот кадр будет использован как визуальный ориентир сцены.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReferencePhoto(null)}
                    className="text-sm font-medium text-rose-300 transition hover:text-rose-200"
                  >
                    Убрать
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {isReferenceOnly && (
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.currentTarget.value)}
              placeholder="Опционально: уточните одежду, атмосферу или детали сцены"
              className="mt-4 min-h-24 w-full rounded-[1.75rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-400/40"
            />
          )}

          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-3 transition hover:border-fuchsia-400/20">
            <input
              type="checkbox"
              checked={enhancePortrait}
              onChange={(e) => setEnhancePortrait(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-fuchsia-400 focus:ring-fuchsia-400/40"
            />
            <span className="text-sm font-medium text-slate-200">
              Улучшить портрет: мягче свет, чище кожа, чуть более polished подача
            </span>
          </label>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={submitFreePrompt}
              disabled={isPending || (isReferenceOnly ? !canRunReference : false)}
              className="inline-flex items-center justify-center rounded-full bg-fuchsia-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Запускаем..." : "Запустить генерацию"}
            </button>
            <Link
              href="/generations"
              className="text-sm font-medium text-fuchsia-300 transition hover:text-fuchsia-200"
            >
              Открыть историю генераций
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-fuchsia-300">
              Рекомендации
            </p>
            <div className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
              <p>Лучше всего работают сцены с понятным местом, светом, настроением и позой.</p>
              <p>Если запрос короткий, укажите хотя бы локацию, стиль, время суток и ощущение кадра.</p>
              <p>Фото-референс особенно полезен, когда нужно повторить композицию или настроение сцены.</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-fuchsia-300">
              Быстрый старт
            </p>
            <div className="mt-3 grid gap-3">
              {!isReferenceOnly ? (
                <QuickPromptButton
                  label="Дорогой студийный портрет"
                  onClick={() =>
                    setPrompt(
                      "Luxury editorial portrait, clean studio light, elegant styling, magazine-quality realism"
                    )
                  }
                />
              ) : null}
              {!isReferenceOnly ? (
                <QuickPromptButton
                  label="Городской вечерний lifestyle"
                  onClick={() =>
                    setPrompt(
                      "Evening city lifestyle photo, cinematic bokeh, expensive light, natural pose, realistic fashion photography"
                    )
                  }
                />
              ) : null}
              {!isReferenceOnly ? (
                <QuickPromptButton
                  label="Нежный daylight portrait"
                  onClick={() =>
                    setPrompt(
                      "Soft daylight portrait near a large window, airy atmosphere, natural skin, premium beauty editorial"
                    )
                  }
                />
              ) : null}
              {isReferenceOnly ? (
                <QuickPromptButton
                  label="Сделать сцену чуть более дорогой"
                  onClick={() => setPrompt("Keep the same composition, but make styling and light more premium.")}
                />
              ) : null}
            </div>
            {!isReferenceOnly && !canRunPrompt ? (
              <p className="mt-3 text-xs text-slate-500">
                Нажмите на заготовку, чтобы быстро попробовать качественный сценарий.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {props.showTemplates !== false ? (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-fuchsia-300">
                Готовые сцены
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                Запускайте шаблоны в один клик
              </h3>
            </div>
            <Link href="/templates" className="text-sm font-medium text-fuchsia-300 hover:text-fuchsia-200">
              Вся галерея
            </Link>
          </div>
          <div className="grid gap-3">
          {props.templates.map((template) => (
            <div
              key={template.id}
              className="rounded-[1.8rem] border border-white/10 bg-slate-950/55 p-4"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-white">{template.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{template.subtitle}</p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-fuchsia-300">
                    {formatRub(template.priceMinor)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill label={template.previewLabel} tone="accent" />
                  <StatusPill label={template.group} tone="neutral" />
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{template.description}</p>
              <div className="mt-4">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => submitTemplate(template)}
                  className="inline-flex items-center justify-center rounded-full border border-fuchsia-400/30 px-4 py-2 text-sm font-semibold text-fuchsia-200 transition hover:bg-fuchsia-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Выбрать
                </button>
              </div>
            </div>
          ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoCard(props: { title: string; text: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm font-semibold text-white">{props.title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{props.text}</p>
    </div>
  );
}

function QuickPromptButton(props: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="rounded-[1.3rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-slate-300 transition hover:border-fuchsia-400/25 hover:bg-fuchsia-500/[0.08] hover:text-white"
    >
      {props.label}
    </button>
  );
}

function QuestionIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M7.9 7.75a2.16 2.16 0 1 1 3.48 1.72c-.8.62-1.38 1.06-1.38 2.03"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="14.2" r="1" fill="currentColor" />
      <circle cx="10" cy="10" r="8.15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function normalizeGenerationLaunchError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Не удалось запустить генерацию.";
  }

  if (error.message === "insufficient_balance") {
    return "Недостаточно средств на балансе.";
  }

  if (error.message === "generation_request_failed") {
    return "Сервис генерации сейчас недоступен. Попробуйте снова через пару минут.";
  }

  if (error.message === "upload_failed") {
    return "Не удалось загрузить фото-референс. Попробуйте другой файл.";
  }

  return error.message;
}

function getShotPreviewSrc(shot: PhotoProfile["shots"][number]) {
  if (!shot.previewUrl) {
    return `/api/shot-reference/${shot.type}?size=512`;
  }

  const version = shot.previewVersion
    ? `?v=${encodeURIComponent(shot.previewVersion)}`
    : "";
  return `${shot.previewUrl}${version}`;
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
