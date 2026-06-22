"use client";

import type { Bookmark } from "@/lib/types";
import { fmtTime } from "@/lib/youtube";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";

const SKIP_SECONDS = [5, 10, 30] as const;

interface TransportProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  disabled: boolean;
  bookmarks: Bookmark[];
  activeBookmarkId: string | null;
  loopLabel: string | null;
  playbackRate: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onScrubStart: () => void;
  onScrubEnd: (time: number) => void;
  onBackToBookmark: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onSkip: (deltaSeconds: number) => void;
  onSelectCue: (bm: Bookmark) => void;
}

function SkipButton({
  delta,
  disabled,
  onClick,
}: {
  delta: number;
  disabled: boolean;
  onClick: () => void;
}) {
  const label = delta < 0 ? `−${Math.abs(delta)}s` : `+${delta}s`;

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`Skip ${label}`}
      onClick={onClick}
      className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wide px-1.5 sm:px-2 py-1 border-[1.5px] border-[#46453e] text-paper bg-transparent cursor-pointer hover:shadow-[2px_2px_0_var(--color-accent)] disabled:opacity-40 disabled:cursor-not-allowed min-w-0"
    >
      {label}
    </button>
  );
}

function CueMarker({
  bm,
  duration,
  isActive,
  onSelect,
}: {
  bm: Bookmark;
  duration: number;
  isActive: boolean;
  onSelect: () => void;
}) {
  const left = duration > 0 ? (bm.start / duration) * 100 : 0;
  const nearStart = left < 12;
  const nearEnd = left > 88;

  return (
    <button
      type="button"
      aria-label={`Cue: ${bm.title} at ${fmtTime(bm.start)}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
      }}
      className={cn(
        "absolute top-1/2 z-[3] -translate-y-1/2 w-3 h-[22px] -translate-x-1/2",
        "flex flex-col items-center justify-center bg-transparent border-0 p-0 cursor-pointer group",
        isActive && "z-[4]",
      )}
      style={{ left: `${left}%` }}
    >
      <span
        className={cn(
          "block w-0.5 h-[18px] opacity-90 transition-transform group-hover:scale-x-[1.5]",
          bm.end != null && bm.loop ? "bg-accent" : "bg-tape",
          isActive && "w-1 bg-accent",
        )}
      />

      <div
        className={cn(
          "pointer-events-none absolute bottom-full mb-2 w-[max(140px,10vw)] max-w-[180px]",
          "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0",
          "group-focus-visible:opacity-100 group-focus-visible:translate-y-0",
          "transition-[opacity,transform] duration-150 z-50",
          nearStart && "left-0 translate-x-0",
          nearEnd && "right-0 left-auto translate-x-0",
          !nearStart && !nearEnd && "left-1/2 -translate-x-1/2",
        )}
      >
        <div className="bg-paper border border-edge shadow-[2px_2px_0_var(--color-edge)] px-2.5 py-2 text-left">
          <div className="font-display text-[12px] font-semibold text-ink leading-snug truncate">
            {bm.title}
          </div>
          <div className="font-mono text-[10px] text-muted mt-0.5 tabular-nums">
            {fmtTime(bm.start)}
            {bm.end != null ? ` – ${fmtTime(bm.end)}` : ""}
            {bm.loop ? " · loop" : ""}
          </div>
          {bm.desc ? (
            <div className="font-mono text-[10px] text-line mt-1 line-clamp-2">
              {bm.desc}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function Transport({
  currentTime,
  duration,
  isPlaying,
  disabled,
  bookmarks,
  activeBookmarkId,
  loopLabel,
  playbackRate,
  onPlayPause,
  onSeek,
  onScrubStart,
  onScrubEnd,
  onBackToBookmark,
  onPlaybackRateChange,
  onSkip,
  onSelectCue,
}: TransportProps) {
  return (
    <div className="bg-ink px-2.5 sm:px-3 pt-3.5 pb-4 text-paper min-w-0 max-w-full overflow-hidden">
      <div className="flex items-center gap-1.5 sm:gap-2.5 mb-3 min-w-0">
        <span className="font-mono text-[11px] sm:text-[13px] tabular-nums text-accent shrink-0 w-[46px] sm:w-[58px]">
          {fmtTime(currentTime)}
        </span>
        <div className="flex-1 relative h-[22px] flex items-center min-w-0">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[22px] z-[1]">
            {duration > 0 &&
              bookmarks.map((bm) => (
                <CueMarker
                  key={bm.id}
                  bm={bm}
                  duration={duration}
                  isActive={bm.id === activeBookmarkId}
                  onSelect={() => onSelectCue(bm)}
                />
              ))}
          </div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            disabled={disabled}
            onChange={(e) => {
              onScrubStart();
              onSeek(Number(e.target.value));
            }}
            onMouseUp={(e) => onScrubEnd(Number(e.currentTarget.value))}
            onTouchEnd={(e) => onScrubEnd(Number(e.currentTarget.value))}
            className="w-full appearance-none bg-transparent m-0 relative z-[2] disabled:opacity-40 [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-[#46453e] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[13px] [&::-webkit-slider-thumb]:h-[13px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:mt-[-4.5px] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink"
          />
        </div>
        <span className="font-mono text-[11px] sm:text-[13px] tabular-nums text-line shrink-0 w-[46px] sm:w-[58px] text-right">
          {fmtTime(duration)}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <div className="flex gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="small"
            disabled={disabled}
            onClick={onPlayPause}
            className="!text-paper !border-[#46453e] hover:!shadow-[2px_2px_0_var(--color-accent)]"
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </Button>
          <Button
            variant="ghost"
            size="small"
            disabled={disabled}
            onClick={onBackToBookmark}
            className="!text-paper !border-[#46453e] hover:!shadow-[2px_2px_0_var(--color-accent)] hidden sm:inline-flex"
          >
            ⏮ Last cue
          </Button>
        </div>

        <select
          value={playbackRate}
          disabled={disabled}
          onChange={(e) => onPlaybackRateChange(Number(e.target.value))}
          className="font-mono text-[11px] bg-transparent text-paper border-[1.5px] border-[#46453e] px-2 py-1.5 cursor-pointer disabled:opacity-40 shrink-0"
        >
          {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
            <option key={r} value={r} className="bg-ink">
              {r}×
            </option>
          ))}
        </select>

        <div className="flex-1 min-w-0" />

        {loopLabel && (
          <div className="font-mono text-[10px] sm:text-[11px] text-accent flex items-center gap-1.5 px-2 py-1.5 border-[1.5px] border-accent-dim shrink min-w-0 max-w-full truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
            <span className="truncate">Loop: {loopLabel}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-1 mt-2.5 min-w-0">
        <div className="flex gap-1 min-w-0">
          {[...SKIP_SECONDS].reverse().map((seconds) => (
            <SkipButton
              key={`back-${seconds}`}
              delta={-seconds}
              disabled={disabled}
              onClick={() => onSkip(-seconds)}
            />
          ))}
        </div>
        <Button
          variant="ghost"
          size="small"
          disabled={disabled}
          onClick={onBackToBookmark}
          className="!text-paper !border-[#46453e] hover:!shadow-[2px_2px_0_var(--color-accent)] sm:hidden shrink-0"
        >
          ⏮
        </Button>
        <div className="flex gap-1 min-w-0">
          {SKIP_SECONDS.map((seconds) => (
            <SkipButton
              key={`fwd-${seconds}`}
              delta={seconds}
              disabled={disabled}
              onClick={() => onSkip(seconds)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
