export interface AudioMimeChoice {
  mime: string;
  extension: string;
}

const CANDIDATES: AudioMimeChoice[] = [
  { mime: 'audio/webm;codecs=opus', extension: 'webm' },
  { mime: 'audio/webm', extension: 'webm' },
  { mime: 'audio/ogg;codecs=opus', extension: 'ogg' },
  { mime: 'audio/mp4;codecs=mp4a.40.2', extension: 'mp4' },
  { mime: 'audio/mp4', extension: 'mp4' },
];

export function pickAudioMime(): AudioMimeChoice {
  if (typeof MediaRecorder === 'undefined') return CANDIDATES[0]!;
  for (const c of CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(c.mime)) return c;
    } catch {
      // ignore — some browsers throw on isTypeSupported
    }
  }
  return CANDIDATES[0]!;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${s}s`;
}

/**
 * Connects an AudioContext analyser to a MediaStream and returns a function
 * that, when called, fills the provided Uint8Array with the current waveform
 * data (-128..127 mapped to 0..255). Returns a teardown function.
 */
export function attachWaveformAnalyser(
  stream: MediaStream,
  bufferSize = 64,
): { read: () => Uint8Array; teardown: () => void } {
  const Ctx: typeof AudioContext = (window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext: typeof AudioContext }).AudioContext
    ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2 ** Math.ceil(Math.log2(Math.max(32, bufferSize * 2)));
  source.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  return {
    read: () => {
      analyser.getByteTimeDomainData(data);
      // Downsample to bufferSize peaks
      const out = new Uint8Array(bufferSize);
      const step = Math.floor(data.length / bufferSize);
      for (let i = 0; i < bufferSize; i++) {
        let max = 128;
        const start = i * step;
        for (let j = 0; j < step; j++) {
          const v = data[start + j] ?? 128;
          if (Math.abs(v - 128) > Math.abs(max - 128)) max = v;
        }
        out[i] = max;
      }
      return out;
    },
    teardown: () => {
      try { source.disconnect(); } catch { /* noop */ }
      try { ctx.close(); } catch { /* noop */ }
    },
  };
}
