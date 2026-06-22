"use client";

import type { Bookmark } from "@/lib/types";
import { CueCard } from "@/components/CueCard";
import { useSwipeUI } from "@/hooks/useSwipeUI";
import { SwipeableList, Type as ListType } from "react-swipeable-list";
import "react-swipeable-list/dist/styles.css";
import { cn } from "@/lib/cn";

interface CueSidebarProps {
  bookmarks: Bookmark[];
  activeBookmarkId: string | null;
  onQuickCue: () => void;
  onAddDetailed: () => void;
  onSelectCue: (bm: Bookmark) => void;
  onEditCue: (bm: Bookmark) => void;
  onDeleteCue: (bm: Bookmark) => void;
  className?: string;
}

export function CueSidebar({
  bookmarks,
  activeBookmarkId,
  onQuickCue,
  onAddDetailed,
  onSelectCue,
  onEditCue,
  onDeleteCue,
  className,
}: CueSidebarProps) {
  const swipeUI = useSwipeUI();

  const cards = bookmarks.map((bm, idx) => (
    <CueCard
      key={bm.id}
      bm={bm}
      index={idx}
      isActive={bm.id === activeBookmarkId}
      swipeEnabled={swipeUI}
      onSelect={() => onSelectCue(bm)}
      onEdit={() => onEditCue(bm)}
      onDelete={() => onDeleteCue(bm)}
    />
  ));

  return (
    <aside
      className={cn(
        "flex flex-col min-h-0 min-w-0 bg-white border-[1.5px] border-ink",
        "w-full flex-1 lg:flex-none lg:w-72 lg:max-w-[288px] lg:shrink-0",
        "lg:max-h-[min(720px,calc(100vh-12rem))]",
        className,
      )}
    >
      <div className="sticky top-0 z-10 bg-paper border-b-[1.5px] border-ink px-3 py-2.5 flex flex-col gap-2 shrink-0">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onQuickCue}
            className="flex-1 font-mono text-xs font-semibold uppercase tracking-wide px-3 py-2.5 bg-accent text-white border-[1.5px] border-accent cursor-pointer"
          >
            Quick cue
          </button>
          <button
            type="button"
            onClick={onAddDetailed}
            className="font-mono text-[10px] uppercase tracking-wide px-2.5 py-2 text-muted bg-white border-[1.5px] border-line cursor-pointer hover:border-ink"
            title="Add with details"
          >
            +
          </button>
        </div>
        <span className="font-mono text-[11px] text-muted">
          {bookmarks.length} {bookmarks.length === 1 ? "cue" : "cues"}
          {swipeUI ? " · swipe to edit or delete" : ""}
        </span>
      </div>

      {bookmarks.length === 0 ? (
        <div className="font-mono text-xs text-line p-6 text-center">
          Tap <strong className="text-ink">Quick cue</strong> while playing to mark a chop.
          {swipeUI ? " Swipe a cue to edit or delete." : " Click a cue to play."}
        </div>
      ) : swipeUI ? (
        <SwipeableList
          type={ListType.IOS}
          fullSwipe
          threshold={0.35}
          destructiveCallbackDelay={0}
          className="cue-swipe-list flex-1 min-h-0"
        >
          {cards}
        </SwipeableList>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">{cards}</div>
      )}
    </aside>
  );
}
