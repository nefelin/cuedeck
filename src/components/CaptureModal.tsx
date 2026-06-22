"use client";

import { Button } from "@/components/Button";
import { NudgeButtons } from "@/components/NudgeButtons";

interface CaptureModalProps {
  title: string;
  start: string;
  end: string;
  cueTitle: string;
  desc: string;
  useEnd: boolean;
  loop: boolean;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onTitleChange: (v: string) => void;
  onDescChange: (v: string) => void;
  onUseEndChange: (v: boolean) => void;
  onLoopChange: (v: boolean) => void;
  onNudgeStart: (deltaSeconds: number) => void;
  onPlayFromStart: () => void;
  onPause: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function CaptureModal({
  title,
  start,
  end,
  cueTitle,
  desc,
  useEnd,
  loop,
  onStartChange,
  onEndChange,
  onTitleChange,
  onDescChange,
  onUseEndChange,
  onLoopChange,
  onNudgeStart,
  onPlayFromStart,
  onPause,
  onSave,
  onCancel,
}: CaptureModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 p-0 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="capture-modal-title"
    >
      <div className="w-full sm:max-w-lg bg-paper border-t-[1.5px] sm:border-[1.5px] border-ink p-4 sm:p-5 max-h-[88dvh] overflow-y-auto shadow-[0_-4px_0_var(--color-ink)] sm:shadow-[4px_4px_0_var(--color-ink)]">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2
            id="capture-modal-title"
            className="text-base font-bold m-0 flex-1 min-w-0"
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            title="Close"
            onClick={onCancel}
            className="w-[26px] h-[26px] shrink-0 flex items-center justify-center bg-transparent border-[1.5px] border-line cursor-pointer text-xs hover:border-ink hover:bg-paper-dim"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <label className="font-mono text-[9px] uppercase tracking-widest text-muted">
              Title
            </label>
            <input
              type="text"
              value={cueTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="e.g. Bridge — chord change"
              className="font-display text-[13px] bg-white border-[1.5px] border-ink px-2.5 py-2 w-full"
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="font-mono text-[9px] uppercase tracking-widest text-muted">
              Start
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={start}
                onChange={(e) => onStartChange(e.target.value)}
                placeholder="0:00"
                className="font-mono text-[13px] bg-white border-[1.5px] border-ink px-2 py-1.5 w-[88px] text-center"
              />
              <Button
                variant="ghost"
                size="small"
                type="button"
                onClick={onPlayFromStart}
                className="shrink-0"
              >
                ▶ Play
              </Button>
              <Button
                variant="ghost"
                size="small"
                type="button"
                onClick={onPause}
                className="shrink-0"
              >
                ⏸ Pause
              </Button>
              <NudgeButtons size="md" label="" onNudge={onNudgeStart} />
            </div>
          </div>

          <label className="flex items-center gap-1.5 font-mono text-[10px] text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useEnd}
              onChange={(e) => onUseEndChange(e.target.checked)}
              className="accent-accent"
            />
            use end point
          </label>

          {useEnd && (
            <>
              <div className="flex flex-col gap-0.5">
                <label className="font-mono text-[9px] uppercase tracking-widest text-muted">
                  End
                </label>
                <input
                  type="text"
                  value={end}
                  onChange={(e) => onEndChange(e.target.value)}
                  placeholder="0:00"
                  className="font-mono text-[13px] bg-white border-[1.5px] border-ink px-2 py-1.5 w-[88px] text-center"
                />
              </div>
              <label className="flex items-center gap-1.5 font-mono text-[10px] text-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={loop}
                  onChange={(e) => onLoopChange(e.target.checked)}
                  className="accent-accent"
                />
                loop this range
              </label>
            </>
          )}

          <div className="flex flex-col gap-0.5">
            <label className="font-mono text-[9px] uppercase tracking-widest text-muted">
              Description (optional)
            </label>
            <input
              type="text"
              value={desc}
              onChange={(e) => onDescChange(e.target.value)}
              placeholder="Notes for yourself…"
              className="font-display text-[13px] bg-white border-[1.5px] border-ink px-2.5 py-2 w-full"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="tape" onClick={onSave} className="flex-1">
              Save
            </Button>
            <Button variant="ghost" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
