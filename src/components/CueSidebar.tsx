"use client";

import type { Bookmark } from "@/lib/types";
import { CueCard } from "@/components/CueCard";

interface CueSidebarProps {
  bookmarks: Bookmark[];
  activeBookmarkId: string | null;
  onQuickCue: () => void;
  onAddDetailed: () => void;
  onSelectCue: (bm: Bookmark) => void;
  onUpdateCueTitle: (bm: Bookmark, title: string) => void;
  onUpdateCueStart: (bm: Bookmark, start: number) => void;
  onEditCueDetails: (bm: Bookmark) => void;
  onDeleteCue: (bm: Bookmark) => void;
  onToggleLoop: (bm: Bookmark) => void;
  onNudgeCue: (bm: Bookmark, deltaSeconds: number) => void;
}

export function CueSidebar({
  bookmarks,
  activeBookmarkId,
  onQuickCue,
  onAddDetailed,
  onSelectCue,
  onUpdateCueTitle,
  onUpdateCueStart,
  onEditCueDetails,
  onDeleteCue,
  onToggleLoop,
  onNudgeCue,
}: CueSidebarProps) {
  return (
    <aside className="flex flex-col w-72 shrink-0 border-[1.5px] border-ink bg-white min-h-0 max-h-[min(720px,calc(100vh-200px))]">
      <div className="sticky top-0 z-10 bg-paper border-b-[1.5px] border-ink px-3 py-2.5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onQuickCue}
          className="w-full font-mono text-xs font-semibold uppercase tracking-wide px-3 py-2 bg-accent text-white border-[1.5px] border-accent cursor-pointer transition-[transform,box-shadow] duration-75 hover:-translate-x-px hover:-translate-y-px hover:shadow-[2px_2px_0_var(--color-ink)]"
        >
          Quick cue
        </button>
        <button
          type="button"
          onClick={onAddDetailed}
          className="w-full font-mono text-[10px] uppercase tracking-wide px-2 py-1 text-muted bg-transparent border-0 cursor-pointer hover:text-ink text-left"
        >
          + Add with details…
        </button>
        <span className="font-mono text-[11px] text-muted">
          {bookmarks.length} {bookmarks.length === 1 ? "cue" : "cues"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {bookmarks.length === 0 ? (
          <div className="font-mono text-xs text-line p-6 text-center">
            Press <kbd className="px-1 bg-paper-dim border border-line rounded-sm">C</kbd>{" "}
            or &ldquo;Quick cue&rdquo; while playing to mark chops fast. Name them
            inline later.
          </div>
        ) : (
          <div className="flex flex-col">
            {bookmarks.map((bm, idx) => (
              <CueCard
                key={bm.id}
                bm={bm}
                index={idx}
                isActive={bm.id === activeBookmarkId}
                onSelect={() => onSelectCue(bm)}
                onUpdateTitle={(title) => onUpdateCueTitle(bm, title)}
                onUpdateStart={(start) => onUpdateCueStart(bm, start)}
                onEditDetails={() => onEditCueDetails(bm)}
                onDelete={() => onDeleteCue(bm)}
                onToggleLoop={() => onToggleLoop(bm)}
                onNudge={(delta) => onNudgeCue(bm, delta)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
