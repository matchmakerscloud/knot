import { eq } from 'drizzle-orm';
import type { Job } from 'bullmq';
import { db } from '../db/client.js';
import { voiceRecordings } from '../db/schema/voice.js';
import { voiceFingerprints } from '../db/schema/voice-fingerprints.js';
import { getStorage } from '../storage/index.js';
import { transcribeAudio, whisperHealthy } from '../transcribe/index.js';
import { voiceFpEmbed, voiceFpVerify, voiceFpHealthy } from '../voice-fp/index.js';
import { computeWaveformPeaks } from '../audio/waveform.js';
import { encryptForStorage, AT_REST_KEY_VERSION } from '../crypto/at-rest.js';
import type { VoiceProcessingJobData } from './index.js';

interface ProcessOutcome {
  status: 'active' | 'rejected';
  rejectionReason?: string;
}

/**
 * Pipeline for one voice recording:
 *   1. Fetch audio from storage
 *   2. Compute waveform peaks via ffmpeg (200 buckets)
 *   3. Voice fingerprint via Resemblyzer microservice
 *      - First recording for user → create fingerprint
 *      - Subsequent → verify against existing; reject on mismatch (anti-catfish)
 *   4. Transcribe via local Whisper (best-effort; failure does not block activation)
 *   5. Update DB row to status=active with all derived metadata
 *
 * Idempotent: re-runs check existing fingerprint before insert.
 */
export async function processVoiceRecording(job: Job<VoiceProcessingJobData>): Promise<ProcessOutcome> {
  const { recordingId, userId, storageKey, contentType } = job.data;
  const log = (msg: string, extra?: Record<string, unknown>) =>
    job.log(`${new Date().toISOString()} ${msg} ${extra ? JSON.stringify(extra) : ''}`).catch(() => {});

  await log('start', { recordingId });

  // 1. Fetch audio
  const audio = await getStorage().getObject(storageKey);
  await log('audio.fetched', { bytes: audio.length });

  // 2. Waveform
  const wf = await computeWaveformPeaks(audio, 200);
  await log('waveform.computed', { duration: wf.durationSeconds });

  // 3. Voice fingerprint
  const existing = await db
    .select()
    .from(voiceFingerprints)
    .where(eq(voiceFingerprints.userId, userId))
    .limit(1);

  let outcome: ProcessOutcome = { status: 'active' };
  const filename = `audio.${storageKey.split('.').pop() ?? 'webm'}`;

  if (await voiceFpHealthy()) {
    if (existing.length === 0) {
      // First fingerprint for this user: just embed and store.
      const embed = await voiceFpEmbed({ buffer: audio, filename, contentType });
      await db.insert(voiceFingerprints).values({
        userId,
        embedding: embed.embedding,
        embeddingDim: embed.dim,
        sourceRecordingId: recordingId,
      });
      await log('voice_fp.created', { dim: embed.dim });
    } else {
      // Verify against existing fingerprint.
      const ref = existing[0]!.embedding as number[];
      const verify = await voiceFpVerify({ buffer: audio, filename, contentType }, ref);
      await log('voice_fp.verified', { similarity: verify.similarity, match: verify.match });
      if (!verify.match) {
        outcome = {
          status: 'rejected',
          rejectionReason: `voice_fp_mismatch:similarity=${verify.similarity.toFixed(3)} threshold=${verify.threshold}`,
        };
      }
    }
  } else {
    await log('voice_fp.unavailable_skipping');
  }

  // 4. Transcribe (only if we're going to keep the recording)
  let transcript: string | null = null;
  if (outcome.status === 'active' && (await whisperHealthy())) {
    try {
      const t = await transcribeAudio({ buffer: audio, filename, contentType });
      transcript = t.text || null;
      await log('transcribe.ok', { chars: transcript?.length ?? 0 });
    } catch (err) {
      await log('transcribe.failed', { err: (err as Error).message });
    }
  }

  // 5. Encrypt at rest (AES-256-GCM with per-content key wrapped by master).
  // Replaces the plaintext object in S3 with ciphertext. Done only when keeping the recording.
  let encryptionMeta: { keyId: string; iv: string; authTag: string; wrappedKey: string } | null = null;
  if (outcome.status === 'active') {
    try {
      const blob = encryptForStorage(audio);
      await getStorage().putObject(storageKey, blob.ciphertext, contentType);
      encryptionMeta = {
        keyId: AT_REST_KEY_VERSION,
        iv: blob.iv,
        authTag: blob.authTag,
        wrappedKey: blob.wrappedKey,
      };
      await log('encrypted_at_rest', { keyVersion: AT_REST_KEY_VERSION, bytes: blob.ciphertext.length });
    } catch (err) {
      await log('encrypt.failed', { err: (err as Error).message });
      // Don't fail the whole pipeline; mark recording as active but unencrypted.
      // Future: alert security on this.
    }
  }

  // 6. Update DB
  await db
    .update(voiceRecordings)
    .set({
      status: outcome.status,
      waveformPeaks: wf.peaks,
      transcript,
      rejectionReason: outcome.rejectionReason ?? null,
      ...(encryptionMeta
        ? {
            encryptionKeyId: encryptionMeta.keyId,
            encryptionIv: encryptionMeta.iv,
            encryptionAuthTag: encryptionMeta.authTag,
            encryptionWrappedKey: encryptionMeta.wrappedKey,
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(voiceRecordings.id, recordingId));

  await log('done', { status: outcome.status });
  return outcome;
}
