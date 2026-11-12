import { env } from "@/lib/env";
import { demoAiProvider } from "@/modules/ai/demoProvider";
import { openaiProvider } from "@/modules/ai/openaiProvider";
import type { AiProvider, MessageGenerator } from "@/modules/ai/types";

export function getAiProvider(): AiProvider {
  const mode = env.aiProvider.toLowerCase();
  if (mode === "demo") {
    return demoAiProvider;
  }
  if (mode === "openai") {
    if (!env.openaiApiKey) {
      return demoAiProvider;
    }
    return openaiProvider;
  }
  if (env.openaiApiKey) {
    return openaiProvider;
  }
  return demoAiProvider;
}

export function getMessageGenerator(): MessageGenerator {
  const provider = getAiProvider();
  return {
    id: provider.id,
    async generateDraft(context) {
      const draft = await provider.generate(context);
      return { body: draft.message, source: provider.id };
    },
  };
}

export { demoAiProvider, openaiProvider };
