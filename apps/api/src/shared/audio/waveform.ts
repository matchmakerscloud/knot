import { spawn } from 'node:child_process';

/**
 * Extract approximate waveform peaks from any audio buffer using ffmpeg.
 *
 * Strategy: downmix to mono, resample to 8kHz, decode to s16le PCM, then
 * compute `count` peaks by taking the max absolute sample in equal-sized windows.
 *
 * Returns: number[] of length `count`, each in [0, 1].
 */
export async function computeWaveformPeaks(
  audio: Buffer,
  count = 200,
): Promise<{ peaks: number[]; durationSeconds: number }> {
  return new Promise((resolve, reject) => {
    const ff = spawn(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel', 'error',
        '-i', 'pipe:0',
        '-f', 's16le',
        '-ac', '1',
        '-ar', '8000',
        'pipe:1',
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );

    const chunks: Buffer[] = [];
    let stderr = '';
    ff.stdout.on('data', (c: Buffer) => chunks.push(c));
    ff.stderr.on('data', (c: Buffer) => { stderr += c.toString(); });
    ff.once('error', reject);
    ff.once('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg.waveform.exit_${code}:${stderr.slice(0, 200)}`));
        return;
      }
      const pcm = Buffer.concat(chunks);
      const sampleCount = pcm.length / 2;
      if (sampleCount === 0) {
        reject(new Error('ffmpeg.waveform.no_samples'));
        return;
      }
      const samplesPerBucket = Math.max(1, Math.floor(sampleCount / count));
      const peaks: number[] = new Array(count).fill(0);
      for (let i = 0; i < count; i++) {
        const start = i * samplesPerBucket;
        const end = Math.min(start + samplesPerBucket, sampleCount);
        let peak = 0;
        for (let j = start; j < end; j++) {
          const sample = pcm.readInt16LE(j * 2);
          const v = Math.abs(sample) / 32768;
          if (v > peak) peak = v;
        }
        peaks[i] = Math.round(peak * 1000) / 1000; // 3-decimal precision
      }
      resolve({ peaks, durationSeconds: sampleCount / 8000 });
    });

    ff.stdin.write(audio);
    ff.stdin.end();
  });
}
