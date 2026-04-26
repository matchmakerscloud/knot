'use client';

import { useEffect, useRef, useState } from 'react';
import { pickAudioMime, attachWaveformAnalyser, formatDuration, type AudioMimeChoice } from '@/lib/audio';
import { Button } from './ui';

const MAX_DURATION = 30; // seconds, per spec

export interface RecordedAudio {
  blob: Blob;
  durationSeconds: number;
  mime: AudioMimeChoice;
}

export interface VoiceRecorderProps {
  onComplete: (audio: RecordedAudio) => void;
  disabled?: boolean;
}

type Phase = 'idle' | 'requesting' | 'recording' | 'preview' | 'error';

export function VoiceRecorder({ onComplete, disabled }: VoiceRecorderProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | undefined>();
  const [elapsed, setElapsed] = useState(0);
  const [waveform, setWaveform] = useState<Uint8Array>(() => new Uint8Array(64).fill(128));
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [recorded, setRecorded] = useState<RecordedAudio | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const teardownRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopAll(), []);

  function stopAll() {
    if (tickRef.current) {
      cancelAnimationFrame(tickRef.current);
      tickRef.current = null;
    }
    if (teardownRef.current) {
      teardownRef.current();
      teardownRef.current = null;
    }
    const r = recorderRef.current;
    if (r && r.state !== 'inactive') {
      try { r.stop(); } catch { /* noop */ }
    }
    if (r?.stream) {
      for (const track of r.stream.getTracks()) track.stop();
    }
    recorderRef.current = null;
  }

  async function startRecording() {
    setError(undefined);
    setRecorded(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(undefined);
    setPhase('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const mime = pickAudioMime();
      const rec = new MediaRecorder(stream, mime.mime ? { mimeType: mime.mime } : {});
      recorderRef.current = rec;
      chunksRef.current = [];
      startedAtRef.current = Date.now();

      rec.addEventListener('dataavailable', (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      });
      rec.addEventListener('stop', () => {
        const blob = new Blob(chunksRef.current, { type: mime.mime || 'audio/webm' });
        const duration = (Date.now() - startedAtRef.current) / 1000;
        setRecorded({ blob, durationSeconds: Math.min(MAX_DURATION, duration), mime });
        setPreviewUrl(URL.createObjectURL(blob));
        setPhase('preview');
      });

      const wave = attachWaveformAnalyser(stream, 64);
      teardownRef.current = wave.teardown;

      const tick = () => {
        const now = (Date.now() - startedAtRef.current) / 1000;
        setElapsed(now);
        setWaveform(wave.read());
        if (now >= MAX_DURATION) {
          if (rec.state === 'recording') rec.stop();
          for (const t of stream.getTracks()) t.stop();
          return;
        }
        tickRef.current = requestAnimationFrame(tick);
      };

      rec.start(250);
      setPhase('recording');
      setElapsed(0);
      tickRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setPhase('error');
      const msg = err instanceof Error ? err.message : 'Audio permission denied';
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setError('Necesitamos permiso de micrófono para grabar tu voz.');
      } else {
        setError(msg);
      }
    }
  }

  function stopRecording() {
    const r = recorderRef.current;
    if (r && r.state === 'recording') r.stop();
    if (tickRef.current) cancelAnimationFrame(tickRef.current);
    if (teardownRef.current) teardownRef.current();
    teardownRef.current = null;
  }

  function discard() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(undefined);
    setRecorded(null);
    setElapsed(0);
    setPhase('idle');
  }

  function confirm() {
    if (recorded) onComplete(recorded);
  }

  const remaining = Math.max(0, MAX_DURATION - elapsed);
  const showCountdown = phase === 'recording' && remaining <= 5;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <Waveform peaks={waveform} active={phase === 'recording'} />
        <div className="mt-4 flex items-baseline justify-between font-sans">
          <span className="text-xs uppercase tracking-wide2 text-mute">
            {phase === 'idle' && 'Listo para grabar'}
            {phase === 'requesting' && 'Pidiendo micrófono...'}
            {phase === 'recording' && (showCountdown ? `Quedan ${Math.ceil(remaining)}s` : 'Grabando')}
            {phase === 'preview' && 'Vista previa'}
            {phase === 'error' && 'Error'}
          </span>
          <span className={`text-sm tabular-nums ${showCountdown ? 'text-danger' : 'text-mute'}`}>
            {phase === 'preview' && recorded
              ? formatDuration(recorded.durationSeconds)
              : formatDuration(elapsed)}{' '}
            / {MAX_DURATION}s
          </span>
        </div>
        {phase === 'preview' && previewUrl ? (
          <audio src={previewUrl} controls className="mt-4 w-full" />
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 font-sans text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {phase === 'idle' || phase === 'error' ? (
          <Button fullWidth onClick={startRecording} disabled={disabled}>
            {phase === 'error' ? 'Reintentar' : 'Empezar a grabar'}
          </Button>
        ) : null}
        {phase === 'recording' ? (
          <Button fullWidth variant="danger" onClick={stopRecording}>
            Detener
          </Button>
        ) : null}
        {phase === 'preview' ? (
          <>
            <Button fullWidth onClick={confirm}>
              Usar este audio
            </Button>
            <Button fullWidth variant="ghost" onClick={discard}>
              Volver a grabar
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Waveform({ peaks, active }: { peaks: Uint8Array; active: boolean }) {
  const bars = Array.from(peaks);
  return (
    <div className="flex h-20 items-center justify-between gap-px">
      {bars.map((v, i) => {
        const amplitude = Math.abs(v - 128) / 128; // 0..1
        const h = Math.max(0.04, amplitude);
        return (
          <div
            key={i}
            className={`w-[2px] rounded-full ${active ? 'bg-accent' : 'bg-border'}`}
            style={{ height: `${(h * 100).toFixed(1)}%` }}
          />
        );
      })}
    </div>
  );
}
