export type LLMRole = 'system' | 'user' | 'assistant';

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

export interface LLMChatRequest {
  model?: string | undefined;
  messages: LLMMessage[];
  temperature?: number | undefined;
  maxTokens?: number | undefined;
  /**
   * If true, request JSON-formatted output. Backend implementations enforce this
   * via response_format / responseSchema where supported.
   */
  jsonMode?: boolean | undefined;
}

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface LLMChatResponse {
  text: string;
  usage?: LLMUsage | undefined;
  finishReason?: string | undefined;
  raw?: unknown;
}

export interface LLMService {
  /** Provider name used in metrics/logs. */
  readonly provider: string;
  /** Default model when request.model is not specified. */
  readonly defaultModel: string;
  /** One-shot chat completion. */
  complete(req: LLMChatRequest): Promise<LLMChatResponse>;
}
