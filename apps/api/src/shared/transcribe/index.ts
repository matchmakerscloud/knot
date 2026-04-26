import { config } from '../../config/index.js';

export interface TranscriptionResult {
  text: string;
  language?: string | undefined;
}

/**
 * Transcribe an audio buffer via the local whisper.cpp HTTP server.
 * Endpoint: POST {WHISPER_URL}/inference  (multipart: file, temperature, response_format)
 *
 * Whisper supports many languages — we don't pin one; whisper-server auto-detects.
 * For Knot we typically pass es/en/pt-BR audios; quality is good with the base model.
 */
export async function transcribeAudio(audio: {
  buffer: Buffer;
  filename: string;
  contentType: string;
  language?: string;
}): Promise<TranscriptionResult> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio.buffer)], { type: audio.contentType }), audio.filename);
  form.append('temperature', '0.0');
  form.append('response_format', 'json');
  if (audio.language) form.append('language', audio.language);

  const res = await fetch(`${config.microservices.whisperUrl}/inference`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    throw new Error(`transcribe.whisper.${res.status}:${await res.text().catch(() => '')}`);
  }
  const data = (await res.json()) as { text?: string; language?: string };
  return {
    text: (data.text ?? '').trim(),
    ...(data.language ? { language: data.language } : {}),
  };
}

export async function whisperHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${config.microservices.whisperUrl}/`, { method: 'GET', signal: AbortSignal.timeout(2000) });
    return res.ok || res.status === 404; // any response = server up
  } catch {
    return false;
  }
}
