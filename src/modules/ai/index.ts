import { env } from "@/lib/env";
import { fallbackGenerator } from "@/modules/ai/fallbackGenerator";
import { openaiGenerator } from "@/modules/ai/openaiGenerator";
import type { MessageGenerator } from "@/modules/ai/types";

export function getMessageGenerator(): MessageGenerator {
  if (env.openaiApiKey) {
    return openaiGenerator;
  }
  return fallbackGenerator;
}

export { fallbackGenerator, openaiGenerator };
