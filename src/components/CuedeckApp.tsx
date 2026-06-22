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
  exportFullLibrary,
  exportVideo,
  shareExport,
} from "@/lib/exportImport";
import { loadLibrary } from "@/lib/storage";
import type { View } from "@/lib/types";
import { cn } from "@/lib/cn";

export function CuedeckApp() {
  const { isReady, isAuthenticated, isCloudActive, hydrationError, saveError, retryHydration } =
    useLibrary();
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
          label: "Share cues",
          onClick: () =>
            void shareExport(
              exportVideo(activeVideo.videoId, activeVideo.title),
              `cuedeck-${activeVideo.videoId}.json`,
            ),
        },
        auth,
      ];
    }

    return [
      {
        label: "Share library",
        onClick: () => void shareExport(exportFullLibrary()),
        disabled: libraryCount === 0,
      },
      auth,
    ];
  }, [isPlayer, activeVideo, session?.user, libraryCount]);

  const showLoading =
    !isReady || (isAuthenticated && !isCloudActive);

  if (showLoading) {
    return (
      <div className="relative z-[2] w-full max-w-[1200px] mx-auto px-4 sm:px-5 pt-7 pb-20 min-w-0 overflow-x-hidden box-border">
        <Header
          onHome={() => {}}
          menuItems={[
            session?.user
              ? { label: "Sign out", onClick: signOutAndFlush }
              : { label: "Sign in", onClick: signInWithGoogle },
          ]}
        />
        {hydrationError ? (
          <div className="font-mono text-xs text-center py-10 px-5 border border-edge bg-white">
            <p className="text-accent-dim m-0 mb-4">{hydrationError}</p>
            <button
              type="button"
              onClick={retryHydration}
              className="font-mono text-[11px] uppercase tracking-wide px-3 py-2 border border-edge bg-paper hover:bg-paper-dim cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : (
          <p className="font-mono text-xs text-muted py-10 text-center">
            Loading your library…
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative z-[2] w-full max-w-[1200px] mx-auto px-4 sm:px-5 min-w-0 overflow-x-hidden box-border",
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
      {saveError && (
        <p className="font-mono text-[11px] text-accent-dim m-0 mb-3">
          {saveError}
        </p>
      )}
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
