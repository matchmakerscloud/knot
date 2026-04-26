import OpenAI from 'openai';
import { config } from '../../config/index.js';
import type { LLMChatRequest, LLMChatResponse, LLMService } from './types.js';

/**
 * Generic OpenAI-Chat-Completions-compatible backend.
 * Works with: OpenAI, Azure OpenAI, Groq, Together, OpenRouter, Mistral, Ollama,
 * vLLM, LM Studio, Cerebras, Fireworks, DeepInfra, etc.
 *
 * Configure via:
 * - LLM_OPENAI_BASE_URL (e.g. https://api.openai.com/v1, https://api.groq.com/openai/v1)
 * - LLM_OPENAI_API_KEY
 * - LLM_OPENAI_MODEL (e.g. gpt-4o-mini, llama-3.3-70b-versatile, mistral-large-latest)
 */
export class OpenAICompatLLMService implements LLMService {
  readonly provider = 'openai-compat';
  readonly defaultModel: string;
  private readonly client: OpenAI;

  constructor() {
    if (!config.llm.openaiCompat.apiKey) {
      throw new Error('llm.openai_compat.api_key_missing');
    }
    this.defaultModel = config.llm.openaiCompat.model;
    this.client = new OpenAI({
      apiKey: config.llm.openaiCompat.apiKey,
      baseURL: config.llm.openaiCompat.baseUrl,
    });
  }

  async complete(req: LLMChatRequest): Promise<LLMChatResponse> {
    const completion = await this.client.chat.completions.create({
      model: req.model ?? this.defaultModel,
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
      ...(req.maxTokens !== undefined ? { max_tokens: req.maxTokens } : {}),
      ...(req.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    });

    const choice = completion.choices[0];
    if (!choice?.message) {
      throw new Error('llm.openai_compat.empty_response');
    }

    return {
      text: choice.message.content ?? '',
      finishReason: choice.finish_reason ?? undefined,
      ...(completion.usage
        ? {
            usage: {
              inputTokens: completion.usage.prompt_tokens,
              outputTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            },
          }
        : {}),
      raw: completion,
    };
  }
}
