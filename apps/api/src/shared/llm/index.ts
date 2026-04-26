import { config } from '../../config/index.js';
import type { LLMService } from './types.js';
import { GeminiLLMService } from './gemini.js';
import { OpenAICompatLLMService } from './openai-compat.js';

export type { LLMService, LLMChatRequest, LLMChatResponse, LLMMessage, LLMUsage, LLMRole } from './types.js';

let cached: LLMService | undefined;

/**
 * Returns the configured LLM service.
 *
 * Selection rules:
 * - If LLM_PROVIDER=gemini → GeminiLLMService (requires GEMINI_API_KEY)
 * - If LLM_PROVIDER=openai-compat → OpenAICompatLLMService (requires LLM_OPENAI_*)
 * - Default: gemini
 *
 * Throws if the chosen provider's credentials are missing — fail loudly at first call,
 * not at boot, so the API can come up even when keys are absent (Mario testing locally).
 */
export function getLLM(): LLMService {
  if (cached) return cached;
  switch (config.llm.provider) {
    case 'openai-compat':
      cached = new OpenAICompatLLMService();
      break;
    case 'gemini':
    default:
      cached = new GeminiLLMService();
  }
  return cached;
}

/**
 * Test-only: reset the cached singleton so the next getLLM() picks up env changes.
 */
export function _resetLLMForTesting() {
  cached = undefined;
}
