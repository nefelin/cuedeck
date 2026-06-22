"use client";

import type { DeckStatusKind } from "@/lib/types";
import { cn } from "@/lib/cn";

interface VideoDeckProps {
  deckStatus: DeckStatusKind | null;
  statusBig: string;
  statusSub: string;
}

export function VideoDeck({ deckStatus, statusBig, statusSub }: VideoDeckProps) {
  return (
    <div className="bg-ink p-2 lg:p-2.5 relative shrink-0 min-w-0 max-w-full overflow-hidden">
      <div className="relative w-full aspect-video max-h-[36dvh] lg:max-h-none bg-black overflow-hidden mx-auto">
        <div
          id="ytPlayer"
          className="absolute inset-0 w-full h-full [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
        />
        {deckStatus && (
          <div
            className={cn(
              "absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 text-[#cfc9ba] font-mono text-xs text-center p-5 bg-black",
              deckStatus === "error" && "[&_.status-big]:text-[#ff8a6c]",
            )}
          >
            {deckStatus === "loading" && (
              <div className="w-[22px] h-[22px] border-2.5 border-[#3a3a3a] border-t-accent rounded-full animate-spin" />
            )}
            <div className="status-big font-display text-[15px] text-white font-semibold">
              {statusBig}
            </div>
            {statusSub && <div>{statusSub}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
