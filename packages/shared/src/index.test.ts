import { describe, expect, it } from "vitest";
import {
  buildGenerationPrompt,
  buildReferenceModePrompt,
  normalizeGeminiErrorMessage,
  type PhotoProfile,
  type PromptTemplate,
} from "./index.js";

const profile: PhotoProfile = {
  id: "profile-test",
  displayName: "Alex",
  completionPercent: 67,
  shots: [
    { id: "1", type: "front_neutral", status: "approved", guidance: "", exampleAngle: "" },
    { id: "2", type: "front_smile", status: "missing", guidance: "", exampleAngle: "" },
    { id: "3", type: "left_45", status: "approved", guidance: "", exampleAngle: "" },
    { id: "4", type: "right_45", status: "approved", guidance: "", exampleAngle: "" },
    { id: "5", type: "left_profile", status: "missing", guidance: "", exampleAngle: "" },
    { id: "6", type: "right_profile", status: "missing", guidance: "", exampleAngle: "" },
  ],
};

const template: PromptTemplate = {
  id: "tpl-1",
  slug: "vip-portrait",
  title: "VIP Portrait",
  subtitle: "Premium portrait",
  group: "vip",
  previewLabel: "VIP",
  description: "Luxury portrait",
  promptSkeleton: "Luxury editorial portrait with clean studio lighting",
  priceMinor: 12900,
  currency: "RUB",
  isActive: true,
};

describe("buildGenerationPrompt", () => {
  it("adds identity and realism guardrails for free prompts", () => {
    const prompt = buildGenerationPrompt({
      input: {
        mode: "free",
        prompt: "rooftop night portrait",
      },
      profile,
    });

    expect(prompt).toContain("Identity lock");
    expect(prompt).toContain("Realism guardrails");
    expect(prompt).toContain("Free mode");
    expect(prompt).toContain("rooftop night portrait");
  });

  it("adds closed-mouth rule when smile shot is missing", () => {
    const prompt = buildGenerationPrompt({
      input: {
        mode: "template",
      },
      profile,
      template,
    });

    expect(prompt).toContain("Keep mouth closed");
    expect(prompt).toContain("Template mode");
  });
});

describe("buildReferenceModePrompt", () => {
  it("uses reference-mode instructions and scene description", () => {
    const prompt = buildReferenceModePrompt({
      sceneDescription:
        "A rooftop dinner at sunset with warm rim light and a luxury city skyline behind the subject.",
      userComment: "Make the styling more premium",
      profile,
      enhancePortrait: true,
    });

    expect(prompt).toContain("Reference mode");
    expect(prompt).toContain("Scene description");
    expect(prompt).toContain("Make the styling more premium");
    expect(prompt).toContain("Apply subtle portrait enhancement");
  });
});

describe("normalizeGeminiErrorMessage", () => {
  it("normalizes quota errors into user-friendly Russian text", () => {
    expect(normalizeGeminiErrorMessage("RESOURCE_EXHAUSTED: quota reached")).toContain(
      "Лимит Gemini временно исчерпан"
    );
  });
});
