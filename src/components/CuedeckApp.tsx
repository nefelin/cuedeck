"use client";

import { useCallback, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { AppMenuItem } from "@/components/AppMenu";
import { Header } from "@/components/Header";
import { LibraryView } from "@/components/LibraryView";
import { PlayerView } from "@/components/PlayerView";
import { useLibrary } from "@/context/LibraryContext";
import { signInWithGoogle, signOutAndFlush } from "@/lib/authActions";
import {
  downloadExport,
  exportFullLibrary,
  exportVideo,
} from "@/lib/exportImport";
import { loadLibrary } from "@/lib/storage";
import type { View } from "@/lib/types";
import { cn } from "@/lib/cn";

export function CuedeckApp() {
  const { isReady } = useLibrary();
  const { data: session } = useSession();
  const [view, setView] = useState<View>("library");
  const [activeVideo, setActiveVideo] = useState<{
    videoId: string;
    title: string;
  } | null>(null);
  const [libraryCount, setLibraryCount] = useState(0);

  const goLibrary = () => {
    setView("library");
    setActiveVideo(null);
  };

  const openVideo = (videoId: string, title: string) => {
    setActiveVideo({ videoId, title });
    setView("player");
  };

  const refreshLibraryCount = useCallback(() => {
    setLibraryCount(loadLibrary().length);
  }, []);

  const isPlayer = view === "player" && activeVideo;

  const menuItems = useMemo((): AppMenuItem[] => {
    const auth: AppMenuItem = session?.user
      ? { label: "Sign out", onClick: signOutAndFlush }
      : { label: "Sign in", onClick: signInWithGoogle };

    if (isPlayer && activeVideo) {
      return [
        {
          label: "Export cues",
          onClick: () =>
            downloadExport(
              exportVideo(activeVideo.videoId, activeVideo.title),
              `cuedeck-${activeVideo.videoId}.json`,
            ),
        },
        auth,
      ];
    }

    return [
      {
        label: "Export library",
        onClick: () => downloadExport(exportFullLibrary()),
        disabled: libraryCount === 0,
      },
      auth,
    ];
  }, [isPlayer, activeVideo, session?.user, libraryCount]);

  if (!isReady) {
    return (
      <div className="relative z-[2] max-w-[1200px] mx-auto px-4 sm:px-5 pt-7 pb-20">
        <Header
          onHome={() => {}}
          menuItems={[
            session?.user
              ? { label: "Sign out", onClick: signOutAndFlush }
              : { label: "Sign in", onClick: signInWithGoogle },
          ]}
        />
        <p className="font-mono text-xs text-muted py-10 text-center">
          Loading your library…
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative z-[2] max-w-[1200px] mx-auto px-4 sm:px-5",
        isPlayer
          ? "max-lg:h-dvh max-lg:flex max-lg:flex-col max-lg:overflow-hidden max-lg:pt-3 max-lg:pb-0 lg:pt-7 lg:pb-20"
          : "pt-7 pb-20",
      )}
    >
      <Header
        onHome={goLibrary}
        compact={!!isPlayer}
        menuItems={menuItems}
      />
      {view === "library" ? (
        <LibraryView
          onOpenVideo={openVideo}
          onLibraryChange={refreshLibraryCount}
        />
      ) : activeVideo ? (
        <PlayerView
          videoId={activeVideo.videoId}
          titleHint={activeVideo.title}
          onTitleChange={(title) =>
            setActiveVideo((prev) => (prev ? { ...prev, title } : prev))
          }
        />
      ) : null}
    </div>
  );
}
