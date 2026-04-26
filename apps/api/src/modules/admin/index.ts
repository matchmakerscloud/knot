import type { FastifyInstance } from 'fastify';
import { config } from '../../config/index.js';
import { getLLM } from '../../shared/llm/index.js';
import { whisperHealthy, transcribeAudio } from '../../shared/transcribe/index.js';
import { getStorage } from '../../shared/storage/index.js';

/**
 * Internal/admin endpoints. NOT PUBLICLY EXPOSED in production — should be reachable
 * only from the admin subdomain (which is IP-allowlisted) or via authenticated admin role.
 * For now they're auth-required, no admin role yet.
 */
export async function adminModule(app: FastifyInstance) {
  // GET /v1/admin/llm/status — what provider/model is configured, are keys present?
  app.get('/llm/status', { preHandler: app.requireAuth }, async () => {
    return {
      provider: config.llm.provider,
      gemini: {
        configured: Boolean(config.llm.gemini.apiKey),
        model: config.llm.gemini.model,
      },
      openaiCompat: {
        configured: Boolean(config.llm.openaiCompat.apiKey),
        baseUrl: config.llm.openaiCompat.baseUrl,
        model: config.llm.openaiCompat.model,
      },
      embeddings: {
        provider: config.llm.embeddings.provider,
        model: config.llm.embeddings.model,
      },
    };
  });

  // GET /v1/admin/services/health — pings local microservices
  app.get('/services/health', { preHandler: app.requireAuth }, async () => {
    const [whisper] = await Promise.all([whisperHealthy()]);
    return {
      whisper: { url: config.microservices.whisperUrl, healthy: whisper },
      voiceFingerprint: {
        url: config.microservices.voiceFingerprintUrl,
        healthy: false, // not yet deployed (Plan #6 next)
      },
    };
  });

  // POST /v1/admin/transcribe/:storageKey — transcribe an audio object via local whisper.cpp
  app.post<{ Body: { storageKey: string } }>('/transcribe', { preHandler: app.requireAuth }, async (req) => {
    const { storageKey } = req.body ?? { storageKey: '' };
    if (!storageKey) return { error: 'missing storageKey' };
    const userId = req.auth!.userId;
    if (!storageKey.startsWith(`voice/${userId}/`)) {
      return { error: 'storageKey does not belong to user' };
    }
    const buf = await getStorage().getObject(storageKey);
    const ext = storageKey.split('.').pop() ?? 'webm';
    const out = await transcribeAudio({
      buffer: buf,
      filename: `audio.${ext}`,
      contentType: `audio/${ext}`,
    });
    return out;
  });

  // POST /v1/admin/llm/ping — sends a tiny prompt to verify connectivity + auth.
  // Returns the LLM's response and usage, or an error.
  app.post('/llm/ping', { preHandler: app.requireAuth }, async () => {
    const llm = getLLM();
    const out = await llm.complete({
      messages: [
        { role: 'system', content: 'Eres Knot, un agente IA al servicio del corazón humano. Sé breve.' },
        { role: 'user', content: 'En una oración, ¿quién eres?' },
      ],
      maxTokens: 80,
      temperature: 0.7,
    });
    return {
      provider: llm.provider,
      model: llm.defaultModel,
      text: out.text,
      usage: out.usage,
      finishReason: out.finishReason,
    };
  });
}
