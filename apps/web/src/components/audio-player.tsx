'use client';

import { useEffect, useRef, useState } from 'react';

interface AudioPlayerProps {
  src: string;
  waveformPeaks?: number[] | undefined;
  onEnded?: (durationListenedMs: number) => void;
  onListenedFull?: () => void;
}

export function AudioPlayer({ src, waveformPeaks, onEnded, onListenedFull }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      setCurrentTime(a.currentTime);
      if (a.duration && Number.isFinite(a.duration)) setProgress(a.currentTime / a.duration);
    };
    const onLoaded = () => {
      if (a.duration && Number.isFinite(a.duration)) setDuration(a.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      const listenedMs = startedAt.current ? Date.now() - startedAt.current : 0;
      onEnded?.(listenedMs);
      onListenedFull?.();
    };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onLoaded);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onLoaded);
      a.removeEventListener('ended', onEnd);
    };
  }, [onEnded, onListenedFull]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      try {
        await a.play();
        if (!startedAt.current) startedAt.current = Date.now();
        setPlaying(true);
      } catch {
        /* user-cancel */
      }
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const peaks = waveformPeaks ?? [];

  return (
    <div className="flex flex-col gap-3">
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggle}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-bg transition active:scale-95"
            aria-label={playing ? 'Pausa' : 'Reproducir'}
          >
            {playing ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><rect x="4" y="3" width="4" height="14" rx="1"/><rect x="12" y="3" width="4" height="14" rx="1"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3l12 7-12 7z"/></svg>
            )}
          </button>
          <div className="flex-1">
            {peaks.length > 0 ? (
              <Waveform peaks={peaks} progress={progress} />
            ) : (
              <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                <div className="h-full bg-accent transition-[width]" style={{ width: `${progress * 100}%` }} />
              </div>
            )}
            <div className="mt-2 flex justify-between font-sans text-xs tabular-nums text-mute">
              <span>{fmt(currentTime)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmt(s: number): string {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function Waveform({ peaks, progress }: { peaks: number[]; progress: number }) {
  const barCount = peaks.length;
  const playedCount = Math.floor(barCount * progress);
  return (
    <div className="flex h-12 items-center gap-px">
      {peaks.map((p, i) => {
        const h = Math.max(0.06, Math.min(1, p));
        const played = i < playedCount;
        return (
          <div
            key={i}
            className={`flex-1 rounded-full transition-colors ${played ? 'bg-accent' : 'bg-border'}`}
            style={{ height: `${(h * 100).toFixed(0)}%` }}
          />
        );
      })}
    </div>
  );
}
