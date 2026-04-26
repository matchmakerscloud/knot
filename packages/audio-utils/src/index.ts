/**
 * Format audio duration in seconds as M:SS.
 */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Downsample raw PCM peaks to target N points for waveform display.
 * Used to reduce a high-resolution waveform to ~200 points for UI.
 */
export function downsamplePeaks(peaks: number[], targetPoints: number): number[] {
  if (peaks.length <= targetPoints) return [...peaks];
  const bucketSize = peaks.length / targetPoints;
  const result: number[] = [];
  for (let i = 0; i < targetPoints; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);
    let max = 0;
    for (let j = start; j < end; j++) {
      const v = peaks[j];
      if (v !== undefined && Math.abs(v) > max) max = Math.abs(v);
    }
    result.push(max);
  }
  return result;
}

/**
 * Normalize peaks to [0, 1] range for consistent visualization.
 */
export function normalizePeaks(peaks: number[]): number[] {
  const max = Math.max(...peaks.map(Math.abs));
  if (max === 0) return peaks.map(() => 0);
  return peaks.map((p) => Math.abs(p) / max);
}

/**
 * Validate that a recording duration is within bounds.
 */
export interface DurationValidation {
  ok: boolean;
  reason?: 'too_short' | 'too_long';
}

export function validateDuration(
  seconds: number,
  min = 1,
  max = 30,
): DurationValidation {
  if (seconds < min) return { ok: false, reason: 'too_short' };
  if (seconds > max) return { ok: false, reason: 'too_long' };
  return { ok: true };
}
