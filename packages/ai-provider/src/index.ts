import type {
  CreateGenerationInput,
  GenerationPromptConfig,
  PhotoProfile,
  PromptTemplate,
  ShotType,
} from "@superava/shared";
import { buildGenerationPrompt } from "@superava/shared";

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
    config?: GenerationPromptConfig;
  }): PreparedGenerationPayload;
}

export { DEFAULT_GENERATION_BASE_PROMPT, buildGenerationPrompt } from "@superava/shared";

export class GeminiProviderAdapter implements AiImageProvider {
  preparePayload(args: {
    input: CreateGenerationInput;
    profile: PhotoProfile;
    template?: PromptTemplate;
    config?: GenerationPromptConfig;
  }): PreparedGenerationPayload {
    const prompt = buildGenerationPrompt(args);

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
