"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { LibraryView } from "@/components/LibraryView";
import { PlayerView } from "@/components/PlayerView";
import type { View } from "@/lib/types";
import { cn } from "@/lib/cn";

export function CuedeckApp() {
  const [view, setView] = useState<View>("library");
  const [activeVideo, setActiveVideo] = useState<{
    videoId: string;
    title: string;
  } | null>(null);

  const goLibrary = () => {
    setView("library");
    setActiveVideo(null);
  };

  const openVideo = (videoId: string, title: string) => {
    setActiveVideo({ videoId, title });
    setView("player");
  };

  const isPlayer = view === "player" && activeVideo;

  return (
    <div
      className={cn(
        "relative z-[2] max-w-[1200px] mx-auto px-4 sm:px-5",
        isPlayer
          ? "max-lg:h-dvh max-lg:flex max-lg:flex-col max-lg:overflow-hidden max-lg:pt-3 max-lg:pb-0 lg:pt-7 lg:pb-20"
          : "pt-7 pb-20",
      )}
    >
      <Header onHome={goLibrary} compact={!!isPlayer} />
      {view === "library" ? (
        <LibraryView onOpenVideo={openVideo} />
      ) : activeVideo ? (
        <PlayerView
          videoId={activeVideo.videoId}
          titleHint={activeVideo.title}
          onBack={goLibrary}
        />
      ) : null}
    </div>
  );
}
