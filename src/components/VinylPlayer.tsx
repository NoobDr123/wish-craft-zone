// Spinning vinyl record player. The center label shows song title + tags.
// When playing, the disc spins; when paused, it slows + stops.

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

interface Props {
  src: string;
  title: string;
  tags?: string;
  onPlay?: () => void;
}

export function VinylPlayer({ src, title, tags, onPlay }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.currentTime);
    const onMeta = () => setDuration(a.duration);
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      await a.play();
      setPlaying(true);
      onPlay?.();
    }
  };

  const seek = (pct: number) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    a.currentTime = (pct / 100) * duration;
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative aspect-square w-full max-w-sm">
        {/* Vinyl disc */}
        <div
          className={`absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,#1a1a1a_0%,#0a0a0a_45%,#1a1a1a_50%,#0a0a0a_55%,#1a1a1a_60%,#0a0a0a_65%,#1a1a1a_70%,#0a0a0a_75%,#1a1a1a_80%,#0a0a0a_85%,#1a1a1a_100%)] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)] transition-transform ${
            playing ? "animate-vinyl-spin" : "animate-vinyl-spin-slow-stop"
          }`}
        >
          {/* Highlight */}
          <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_120deg,transparent_0deg,rgba(255,255,255,0.06)_45deg,transparent_90deg,transparent_360deg)]" />
          {/* Center label */}
          <div className="absolute left-1/2 top-1/2 flex aspect-square w-[40%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-ribbon text-center shadow-inner">
            <div className="px-3">
              <p className="font-display text-sm font-semibold leading-tight text-primary-foreground">
                {title}
              </p>
              {tags && (
                <p className="mt-1 text-[10px] uppercase tracking-widest text-primary-foreground/80">
                  {tags}
                </p>
              )}
            </div>
            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background" />
          </div>
        </div>

        {/* Play / pause overlay */}
        <button
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="absolute -bottom-2 left-1/2 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform hover:scale-105"
        >
          {playing ? (
            <Pause className="h-7 w-7" />
          ) : (
            <Play className="ml-1 h-7 w-7" />
          )}
        </button>
      </div>

      <div className="mt-12 w-full max-w-sm">
        <input
          type="range"
          min={0}
          max={100}
          value={duration ? (progress / duration) * 100 : 0}
          onChange={(e) => seek(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{fmt(progress)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}
