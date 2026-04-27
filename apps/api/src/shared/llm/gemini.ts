import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/index.js';
import type { LLMChatRequest, LLMChatResponse, LLMService, LLMMessage } from './types.js';

export class GeminiLLMService implements LLMService {
  readonly provider = 'gemini';
  readonly defaultModel: string;
  private readonly client: GoogleGenerativeAI;

  constructor() {
    if (!config.llm.gemini.apiKey) {
      throw new Error('llm.gemini.api_key_missing');
    }
    this.defaultModel = config.llm.gemini.model;
    this.client = new GoogleGenerativeAI(config.llm.gemini.apiKey);
  }

  async complete(req: LLMChatRequest): Promise<LLMChatResponse> {
    const modelName = req.model ?? this.defaultModel;
    const { systemInstruction, history, lastUserText } = mapMessagesToGemini(req.messages);

    const generationConfig: Record<string, unknown> = {};
    if (req.temperature !== undefined) generationConfig.temperature = req.temperature;
    if (req.maxTokens !== undefined) generationConfig.maxOutputTokens = req.maxTokens;
    if (req.jsonMode) generationConfig.responseMimeType = 'application/json';

    const model = this.client.getGenerativeModel({
      model: modelName,
      ...(systemInstruction ? { systemInstruction } : {}),
      generationConfig,
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastUserText);
    const response = result.response;

    return {
      text: response.text(),
      finishReason: response.candidates?.[0]?.finishReason,
      ...(response.usageMetadata
        ? {
            usage: {
              inputTokens: response.usageMetadata.promptTokenCount ?? 0,
              outputTokens: response.usageMetadata.candidatesTokenCount ?? 0,
              totalTokens: response.usageMetadata.totalTokenCount ?? 0,
            },
          }
        : {}),
      raw: response,
    };
  }
}

function mapMessagesToGemini(messages: LLMMessage[]): {
  systemInstruction?: string;
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  lastUserText: string;
} {
  // Gemini API: system instruction is separate; history alternates user/model;
  // the final user message is sent via sendMessage.
  const systemPieces = messages.filter((m) => m.role === 'system').map((m) => m.content);
  const conversational = messages.filter((m) => m.role !== 'system');

  // Find the last user message; everything before it goes into history.
  let lastUserIdx = -1;
  for (let i = conversational.length - 1; i >= 0; i--) {
    if (conversational[i]!.role === 'user') {
      lastUserIdx = i;
      break;
    }
  }
  if (lastUserIdx === -1) {
    throw new Error('llm.gemini.no_user_message');
  }
  let historyMessages = conversational.slice(0, lastUserIdx);
  const lastUser = conversational[lastUserIdx]!;

  // Gemini requires history[0] to have role 'user'. Drop any leading 'assistant'
  // messages (e.g., Knot's opening greeting before the user has said anything).
  while (historyMessages.length > 0 && historyMessages[0]!.role === 'assistant') {
    historyMessages = historyMessages.slice(1);
  }

  const history = historyMessages.map((m) => ({
    role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
    parts: [{ text: m.content }],
  }));

  return {
    ...(systemPieces.length ? { systemInstruction: systemPieces.join('\n\n') } : {}),
    history,
    lastUserText: lastUser.content,
  };
}
