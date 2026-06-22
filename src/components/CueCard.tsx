"use client";

import type { Bookmark } from "@/lib/types";
import { fmtTime } from "@/lib/youtube";
import { cn } from "@/lib/cn";
import {
  LeadingActions,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
} from "react-swipeable-list";

interface CueCardProps {
  bm: Bookmark;
  index: number;
  isActive: boolean;
  swipeEnabled: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function CueCardContent({
  bm,
  index,
  isActive,
  showButtons,
  onSelect,
  onEdit,
  onDelete,
}: CueCardProps & { showButtons: boolean }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={cn(
        "group relative w-full min-w-full box-border grid grid-cols-[32px_1fr] gap-2 items-start px-2.5 py-3 border-b border-line cursor-pointer transition-colors hover:bg-paper-dim active:bg-paper-dim bg-white",
        isActive && "border-l-[3px] border-l-accent pl-2",
      )}
    >
      {showButtons && (
        <div
          className={cn(
            "absolute top-2 right-2 flex gap-1.5 transition-opacity z-10",
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <button
            type="button"
            title="Edit cue"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center text-[11px] text-muted hover:text-ink bg-transparent border-0 cursor-pointer leading-none"
          >
            ✎
          </button>
          <button
            type="button"
            title="Delete cue"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center text-[11px] text-muted hover:text-accent bg-transparent border-0 cursor-pointer leading-none"
          >
            ✕
          </button>
        </div>
      )}

      <div className="font-mono text-[11px] text-line pt-0.5">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className={cn("min-w-0", showButtons && "pr-14")}>
        <h3 className="m-0 mb-0.5 text-sm font-semibold truncate">{bm.title}</h3>
        {bm.desc && (
          <p className="text-xs text-[#5c5b54] m-0 mb-1 leading-snug line-clamp-2">
            {bm.desc}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[11px] text-accent-dim bg-[#fff3ee] px-1.5 py-0.5 border border-[#f3c4b3]">
            {bm.end != null
              ? `${fmtTime(bm.start)} → ${fmtTime(bm.end)}`
              : fmtTime(bm.start)}
          </span>
          {bm.end != null && (
            <span className="font-mono text-[10px] text-tape bg-[#e7efe9] px-1.5 py-0.5 border border-[#b9d0c0] uppercase tracking-wide">
              {bm.loop ? "loop" : "once"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const leadingActions = (onEdit: () => void) => (
  <LeadingActions>
    <SwipeAction onClick={onEdit}>
      <span className="cue-swipe-action cue-swipe-action--edit">Edit</span>
    </SwipeAction>
  </LeadingActions>
);

const trailingActions = (onDelete: () => void) => (
  <TrailingActions>
    <SwipeAction destructive onClick={onDelete}>
      <span className="cue-swipe-action cue-swipe-action--delete">Delete</span>
    </SwipeAction>
  </TrailingActions>
);

export function CueCard({
  bm,
  index,
  isActive,
  swipeEnabled,
  onSelect,
  onEdit,
  onDelete,
}: CueCardProps) {
  const content = (
    <CueCardContent
      bm={bm}
      index={index}
      isActive={isActive}
      swipeEnabled={swipeEnabled}
      showButtons={!swipeEnabled}
      onSelect={onSelect}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );

  if (!swipeEnabled) return content;

  return (
    <SwipeableListItem
      leadingActions={leadingActions(onEdit)}
      trailingActions={trailingActions(onDelete)}
      threshold={0.35}
    >
      {content}
    </SwipeableListItem>
  );
}
