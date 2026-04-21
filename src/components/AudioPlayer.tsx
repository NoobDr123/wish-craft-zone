import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2 } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  title?: string;
  artist?: string;
  variant?: "compact" | "full";
  lyrics?: string;
}

function formatTime(time: number) {
  if (!Number.isFinite(time) || time < 0) return "0:00";
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  src,
  title,
  artist,
  variant = "compact",
  lyrics,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => undefined);
      setIsPlaying(true);
    }
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const v = Number(e.target.value);
    audio.currentTime = v;
    setCurrentTime(v);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
        <button
          onClick={toggle}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:bg-primary-hover hover:shadow-glow"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
        </button>
        <div className="min-w-0 flex-1">
          {title && (
            <p className="truncate text-sm font-medium text-foreground">{title}</p>
          )}
          {artist && (
            <p className="truncate text-xs text-muted-foreground">{artist}</p>
          )}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-peach">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <audio ref={audioRef} src={src} preload="metadata" />
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
      <div className="flex items-center gap-5">
        <button
          onClick={toggle}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition-all hover:bg-primary-hover"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7" />}
        </button>
        <div className="min-w-0 flex-1">
          {title && (
            <p className="font-display text-xl font-semibold text-foreground">
              {title}
            </p>
          )}
          {artist && <p className="text-sm text-muted-foreground">{artist}</p>}
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={onSeek}
          className="ribbon-range w-full"
          aria-label="Seek"
        />
        <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {lyrics && (
        <div className="mt-8 max-h-72 overflow-y-auto rounded-2xl bg-background p-6">
          <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-foreground">
            {lyrics}
          </pre>
        </div>
      )}

      <audio ref={audioRef} src={src} preload="metadata" />

      <style>{`
        .ribbon-range {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          background: linear-gradient(
            to right,
            var(--primary) 0%,
            var(--primary) ${progress}%,
            var(--peach) ${progress}%,
            var(--peach) 100%
          );
          border-radius: 9999px;
          outline: none;
        }
        .ribbon-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: var(--primary);
          border: 3px solid var(--background);
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          cursor: pointer;
        }
        .ribbon-range::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: var(--primary);
          border: 3px solid var(--background);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
