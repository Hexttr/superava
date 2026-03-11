import { getAdminAppConfig, getAdminPromptParts } from "@/lib/server-api";
import { BillingConfigForm } from "./billing-config-form";
import { PromptPartEditor } from "./prompt-part-editor";

export default async function AdminPromptsPage() {
  const [config, parts] = await Promise.all([getAdminAppConfig(), getAdminPromptParts()]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Промпты (конструктор)</h1>
      <p className="mt-2 text-slate-400">
        Редактируйте части конструктора промптов. Порядок: base → profile_meta → closed_mouth →
        scene_request → enhance_portrait.
      </p>
      <div className="mt-6">
        <BillingConfigForm config={config} />
      </div>
      <div className="mt-6 space-y-4">
        {parts.map((part) => (
          <PromptPartEditor key={part.id} part={part} />
        ))}
      </div>
    </div>
  );
}
