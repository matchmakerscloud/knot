import { config } from '../../config/index.js';

export interface VoiceFingerprintEmbedResult {
  embedding: number[];
  dim: number;
}

export interface VoiceFingerprintVerifyResult {
  similarity: number;
  threshold: number;
  match: boolean;
  embedding: number[];
}

async function postMultipart<T>(path: string, audio: { buffer: Buffer; filename: string; contentType: string }, extra?: Record<string, string>): Promise<T> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio.buffer)], { type: audio.contentType }), audio.filename);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) form.append(k, v);
  }
  const res = await fetch(`${config.microservices.voiceFingerprintUrl}${path}`, { method: 'POST', body: form });
  if (!res.ok) {
    throw new Error(`voice_fp.${path}.${res.status}:${await res.text().catch(() => '')}`);
  }
  return (await res.json()) as T;
}

export async function voiceFpEmbed(audio: { buffer: Buffer; filename: string; contentType: string }): Promise<VoiceFingerprintEmbedResult> {
  return postMultipart<VoiceFingerprintEmbedResult>('/embed', audio);
}

export async function voiceFpVerify(audio: { buffer: Buffer; filename: string; contentType: string }, fingerprint: number[]): Promise<VoiceFingerprintVerifyResult> {
  return postMultipart<VoiceFingerprintVerifyResult>('/verify', audio, { fingerprint: JSON.stringify(fingerprint) });
}

export async function voiceFpHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${config.microservices.voiceFingerprintUrl}/health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}
