import type {
  CreateGenerationInput,
  PhotoProfile,
  PromptTemplate,
  ShotType,
} from "@superava/shared";

export interface ReferenceShotAsset {
  shotType: ShotType;
}

export interface PreparedGenerationPayload {
  model: string;
  prompt: string;
  referenceShots: ReferenceShotAsset[];
}

export interface AiImageProvider {
  preparePayload(args: {
    input: CreateGenerationInput;
    profile: PhotoProfile;
    template?: PromptTemplate;
  }): PreparedGenerationPayload;
}

const sharedPromptRules = [
  "Generate exactly one photorealistic image.",
  "Use the reference face consistently across all supplied images.",
  "Preserve the user's identity, facial proportions, age range, and ethnicity.",
  "Keep skin texture natural and realistic, without plastic retouching.",
  "Do not invent accessories, extra people, duplicate faces, or distorted anatomy.",
  "Prioritize facial likeness over artistic stylization.",
].join(" ");

export class GeminiProviderAdapter implements AiImageProvider {
  preparePayload(args: {
    input: CreateGenerationInput;
    profile: PhotoProfile;
    template?: PromptTemplate;
  }): PreparedGenerationPayload {
    const promptParts = [
      args.template?.title ? `Template: ${args.template.title}.` : undefined,
      args.template?.description ? `Template guidance: ${args.template.description}.` : undefined,
      args.input.prompt ? `User request: ${args.input.prompt}.` : undefined,
      `Profile completeness: ${args.profile.completionPercent}%.`,
      `Reference photos cover ${args.profile.shots.filter((shot) => shot.status !== "missing").length} face angles.`,
      sharedPromptRules,
    ].filter(Boolean);

    const prompt = promptParts.join(" ");

    const referenceShots = args.profile.shots
      .filter((shot) => shot.status !== "missing")
      .map((shot) => ({
        shotType: shot.type,
      }));

    return {
      model: "gemini-2.5-flash-image",
      prompt,
      referenceShots,
    };
  }
}
