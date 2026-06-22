"use client";

import type { Bookmark } from "@/lib/types";
import { fmtTime } from "@/lib/youtube";
import { Button } from "@/components/Button";

interface TransportProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  disabled: boolean;
  bookmarks: Bookmark[];
  loopLabel: string | null;
  playbackRate: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onScrubStart: () => void;
  onScrubEnd: (time: number) => void;
  onBackToBookmark: () => void;
  onPlaybackRateChange: (rate: number) => void;
}

export function Transport({
  currentTime,
  duration,
  isPlaying,
  disabled,
  bookmarks,
  loopLabel,
  playbackRate,
  onPlayPause,
  onSeek,
  onScrubStart,
  onScrubEnd,
  onBackToBookmark,
  onPlaybackRateChange,
}: TransportProps) {
  return (
    <div className="bg-ink px-3 pt-3.5 pb-4 text-paper">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="font-mono text-[13px] tabular-nums text-accent min-w-[58px]">
          {fmtTime(currentTime)}
        </span>
        <div className="flex-1 relative h-[22px] flex items-center">
          <div className="absolute left-0 right-0 top-1/2 h-0 pointer-events-none z-[1]">
            {duration > 0 &&
              bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className={`absolute top-[-9px] w-0.5 h-[18px] opacity-85 ${
                    bm.end != null && bm.loop ? "bg-accent" : "bg-tape"
                  }`}
                  style={{ left: `${(bm.start / duration) * 100}%` }}
                  title={bm.title}
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
        <span className="font-mono text-[13px] tabular-nums text-line min-w-[58px] text-right">
          {fmtTime(duration)}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1.5">
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
            className="!text-paper !border-[#46453e] hover:!shadow-[2px_2px_0_var(--color-accent)]"
          >
            ⏮ Last cue
          </Button>
        </div>

        <select
          value={playbackRate}
          disabled={disabled}
          onChange={(e) => onPlaybackRateChange(Number(e.target.value))}
          className="font-mono text-[11px] bg-transparent text-paper border-[1.5px] border-[#46453e] px-2 py-1.5 cursor-pointer disabled:opacity-40"
        >
          {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
            <option key={r} value={r} className="bg-ink">
              {r}×
            </option>
          ))}
        </select>

        <div className="flex-1" />

        {loopLabel && (
          <div className="font-mono text-[11px] text-accent flex items-center gap-1.5 px-2.5 py-1.5 border-[1.5px] border-accent-dim">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Looping: {loopLabel}
          </div>
        )}
      </div>
    </div>
  );
}
