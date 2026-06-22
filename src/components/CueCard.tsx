"use client";

import { useEffect, useState } from "react";
import type { Bookmark } from "@/lib/types";
import { fmtTime, parseTime } from "@/lib/youtube";
import { cn } from "@/lib/cn";
import { NudgeButtons } from "@/components/NudgeButtons";

const inlineInput =
  "w-full bg-transparent border-0 border-b border-transparent p-0 m-0 outline-none focus:border-line rounded-none";

interface CueCardProps {
  bm: Bookmark;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onUpdateTitle: (title: string) => void;
  onUpdateStart: (start: number) => void;
  onEditDetails: () => void;
  onDelete: () => void;
  onToggleLoop: () => void;
  onNudge: (deltaSeconds: number) => void;
}

export function CueCard({
  bm,
  index,
  isActive,
  onSelect,
  onUpdateTitle,
  onUpdateStart,
  onEditDetails,
  onDelete,
  onToggleLoop,
  onNudge,
}: CueCardProps) {
  const [titleDraft, setTitleDraft] = useState(bm.title);
  const [startDraft, setStartDraft] = useState(fmtTime(bm.start));

  useEffect(() => {
    setTitleDraft(bm.title);
    setStartDraft(fmtTime(bm.start));
  }, [bm.title, bm.start]);

  const commitTitle = () => {
    const next = titleDraft.trim() || fmtTime(bm.start);
    setTitleDraft(next);
    if (next !== bm.title) onUpdateTitle(next);
  };

  const commitStart = () => {
    const parsed = parseTime(startDraft);
    if (parsed == null) {
      setStartDraft(fmtTime(bm.start));
      return;
    }
    if (Math.abs(parsed - bm.start) > 0.01) {
      onUpdateStart(parsed);
    } else {
      setStartDraft(fmtTime(bm.start));
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={cn(
        "group relative grid grid-cols-[36px_1fr] gap-2 items-start px-2.5 py-3 border-b border-line cursor-pointer transition-colors hover:bg-paper-dim",
        isActive && "bg-white border-l-[3px] border-l-accent pl-2",
      )}
    >
      <div
        className={cn(
          "absolute top-2 right-2 flex gap-1.5 transition-opacity",
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <button
          type="button"
          title="Range & notes"
          onClick={(e) => {
            e.stopPropagation();
            onEditDetails();
          }}
          className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center text-[11px] text-muted hover:text-ink bg-transparent border-0 cursor-pointer leading-none"
        >
          ✎
        </button>
        <button
          type="button"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center text-[11px] text-muted hover:text-accent bg-transparent border-0 cursor-pointer leading-none"
        >
          ✕
        </button>
      </div>

      <div className="font-mono text-[11px] text-line pt-1">
        {String(index + 1).padStart(2, "0")}
      </div>

      <div className="min-w-0 pr-6">
        <input
          type="text"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            inlineInput,
            "font-display text-sm font-semibold mb-1.5 text-ink",
          )}
          aria-label="Cue title"
        />

        {bm.desc && (
          <p className="text-xs text-[#5c5b54] m-0 mb-1.5 leading-snug line-clamp-2 pointer-events-none">
            {bm.desc}
          </p>
        )}

        <div
          className="flex flex-wrap items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center font-mono text-[11px] text-accent-dim bg-[#fff3ee] px-1 py-0.5 border border-[#f3c4b3]">
            <NudgeButtons
              label=""
              onNudge={onNudge}
              center={
                <input
                  type="text"
                  value={startDraft}
                  onChange={(e) => setStartDraft(e.target.value)}
                  onBlur={commitStart}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  className={cn(
                    inlineInput,
                    "w-[52px] font-mono text-[11px] text-accent-dim text-center focus:text-ink",
                  )}
                  aria-label="Cue start time"
                />
              }
            />
          </div>

          {bm.end != null && (
            <>
              <span className="font-mono text-[11px] text-line">→</span>
              <span className="font-mono text-[11px] text-accent-dim bg-[#fff3ee] px-1.5 py-0.5 border border-[#f3c4b3]">
                {fmtTime(bm.end)}
              </span>
              <button
                type="button"
                title="Toggle looping"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLoop();
                }}
                className="font-mono text-[10px] text-tape bg-[#e7efe9] px-1.5 py-0.5 border border-[#b9d0c0] uppercase tracking-wide cursor-pointer"
              >
                {bm.loop ? "loop on" : "loop off"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
