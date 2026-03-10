"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { PromptTemplate } from "@superava/shared";
import { StatusPill } from "@superava/ui";
import { createGenerationRequest } from "@/lib/api";

export function GenerationComposer(props: { templates: PromptTemplate[] }) {
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
          <StatusPill label={isPending ? "отправка" : "готово"} tone="accent" />
        </div>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.currentTarget.value)}
          placeholder="Я на крыше Токио ночью, кинематографично, дорогой свет..."
          className="mt-4 min-h-32 w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
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
      </div>

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
