"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CueSidebar } from "@/components/CueSidebar";
import { CaptureBar, Transport } from "@/components/Transport";
import { VideoDeck } from "@/components/VideoDeck";
import { whenYTReady, useYouTubeApi } from "@/hooks/useYouTubeApi";
import {
  loadBookmarksFor,
  saveBookmarksFor,
  upsertLibraryEntry,
} from "@/lib/storage";
import type { Bookmark, DeckStatusKind } from "@/lib/types";
import { fmtTime, genId, parseTime } from "@/lib/youtube";
import { Button } from "@/components/Button";
import { downloadExport, exportVideo } from "@/lib/exportImport";

interface PlayerViewProps {
  videoId: string;
  titleHint: string;
  onBack: () => void;
}

export function PlayerView({ videoId, titleHint, onBack }: PlayerViewProps) {
  const { ready: ytReady, failed: ytFailed } = useYouTubeApi();

  const playerRef = useRef<YT.Player | null>(null);
  const scrubIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrubbingRef = useRef(false);
  const bookmarksRef = useRef<Bookmark[]>([]);
  const activeBookmarkIdRef = useRef<string | null>(null);
  const videoIdRef = useRef(videoId);

  const [title, setTitle] = useState(titleHint);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [activeBookmarkId, setActiveBookmarkId] = useState<string | null>(null);
  const playerReadyRef = useRef(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const [deckStatus, setDeckStatus] = useState<DeckStatusKind | null>("loading");
  const [statusBig, setStatusBig] = useState("Loading player…");
  const [statusSub, setStatusSub] = useState("Connecting to YouTube");

  const [showCapture, setShowCapture] = useState(false);
  const [captureVariant, setCaptureVariant] = useState<"full" | "details">("full");
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [capStart, setCapStart] = useState("");
  const [capEnd, setCapEnd] = useState("");
  const [capTitle, setCapTitle] = useState("");
  const [capDesc, setCapDesc] = useState("");
  const [capUseEnd, setCapUseEnd] = useState(false);

  bookmarksRef.current = bookmarks;
  activeBookmarkIdRef.current = activeBookmarkId;
  videoIdRef.current = videoId;

  const showDeckError = useCallback((big: string, sub: string) => {
    setDeckStatus("error");
    setStatusBig(big);
    setStatusSub(sub);
  }, []);

  const clearScrubTimer = useCallback(() => {
    if (scrubIntervalRef.current) {
      clearInterval(scrubIntervalRef.current);
      scrubIntervalRef.current = null;
    }
  }, []);

  const destroyPlayerInstance = useCallback(() => {
    clearScrubTimer();
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    }
    playerReadyRef.current = false;
  }, [clearScrubTimer]);

  useEffect(() => {
    setTitle(titleHint);
  }, [titleHint]);

  useEffect(() => {
    setActiveBookmarkId(null);
    setShowCapture(false);
    setEditingBookmark(null);
    setBookmarks(loadBookmarksFor(videoId));
    setCurrentTime(0);
    setDuration(0);
    setPlayerReady(false);
    setDeckStatus("loading");
    setStatusBig("Loading player…");
    setStatusSub("Connecting to YouTube");

    upsertLibraryEntry({ videoId, lastOpened: Date.now() });

    if (ytFailed) {
      showDeckError(
        "Couldn't reach YouTube",
        "Check your internet connection and try again.",
      );
      return destroyPlayerInstance;
    }

    if (!ytReady) return destroyPlayerInstance;

    loadTimeoutRef.current = setTimeout(() => {
      if (!playerReadyRef.current) {
        showDeckError(
          "This is taking too long",
          "YouTube may be unreachable, or this video can't be embedded. Try reloading.",
        );
      }
    }, 12000);

    const checkLoop = (t: number) => {
      const activeId = activeBookmarkIdRef.current;
      if (activeId == null || !playerRef.current) return;
      const bm = bookmarksRef.current.find((b) => b.id === activeId);
      if (!bm || bm.end == null) return;
      if (t >= bm.end - 0.15) {
        if (bm.loop) playerRef.current.seekTo(bm.start, true);
        else {
          playerRef.current.pauseVideo();
          playerRef.current.seekTo(bm.end, true);
        }
      }
    };

    const startScrubTimer = () => {
      clearScrubTimer();
      scrubIntervalRef.current = setInterval(() => {
        if (!playerRef.current || isScrubbingRef.current) return;
        const t = playerRef.current.getCurrentTime();
        setCurrentTime(t);
        checkLoop(t);
      }, 200);
    };

    const onPlayerReady = () => {
      if (videoIdRef.current !== videoId || !playerRef.current) return;
      setPlayerReady(true);
      playerReadyRef.current = true;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      setDeckStatus(null);
      const dur = playerRef.current.getDuration() || 0;
      setDuration(dur);
      startScrubTimer();
    };

    const onPlayerError = (code: number) => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      let msg = "Something went wrong playing this video.";
      if (code === 101 || code === 150) {
        msg = "The video owner has disabled playback on other sites.";
      } else if (code === 100) {
        msg = "This video is private or has been removed.";
      } else if (code === 2) {
        msg = "That video ID doesn't look valid.";
      }
      showDeckError("Can't play this video", msg);
    };

    const createPlayer = () => {
      if (videoIdRef.current !== videoId) return;
      destroyPlayerInstance();
      try {
        playerRef.current = new YT.Player("ytPlayer", {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: { autoplay: 0, rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onReady: onPlayerReady,
            onStateChange: (e) => {
              setIsPlaying(e.data === YT.PlayerState.PLAYING);
            },
            onError: (e) => onPlayerError(e.data),
          },
        });
      } catch {
        showDeckError(
          "Couldn't load this video",
          "Something went wrong starting the player.",
        );
      }
    };

    whenYTReady(createPlayer);

    return () => {
      destroyPlayerInstance();
      setPlayerReady(false);
    };
  }, [
    videoId,
    ytReady,
    ytFailed,
    showDeckError,
    clearScrubTimer,
    destroyPlayerInstance,
  ]);

  const persistBookmarks = useCallback(
    (next: Bookmark[]) => {
      const sorted = [...next].sort((a, b) => a.start - b.start);
      setBookmarks(sorted);
      saveBookmarksFor(videoId, sorted);
      return sorted;
    },
    [videoId],
  );

  const seekAndPlay = useCallback((time: number) => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(time, true);
    playerRef.current.playVideo();
    setCurrentTime(time);
  }, []);

  const clampStart = useCallback(
    (start: number, end: number | null) => {
      const dur = playerRef.current?.getDuration() ?? duration;
      const max = end != null ? end - 0.1 : Math.max(0, dur - 0.1);
      return Math.max(0, Math.min(start, max));
    },
    [duration],
  );

  const addQuickCue = useCallback(() => {
    if (!playerReadyRef.current || !playerRef.current) return;
    const t = playerRef.current.getCurrentTime();
    const newBm: Bookmark = {
      id: genId("bm"),
      start: t,
      end: null,
      loop: false,
      title: fmtTime(t),
      desc: "",
    };
    persistBookmarks([...bookmarksRef.current, newBm]);
    setActiveBookmarkId(newBm.id);
  }, [persistBookmarks]);

  const nudgeCueStart = useCallback(
    (bm: Bookmark, deltaSeconds: number) => {
      const newStart = clampStart(bm.start + deltaSeconds, bm.end);
      const updated = bookmarksRef.current.map((b) =>
        b.id === bm.id ? { ...b, start: newStart } : b,
      );
      persistBookmarks(updated);
      setActiveBookmarkId(bm.id);
      seekAndPlay(newStart);
      if (editingBookmark?.id === bm.id) {
        setCapStart(fmtTime(newStart));
        setEditingBookmark((prev) =>
          prev ? { ...prev, start: newStart } : prev,
        );
      }
    },
    [clampStart, persistBookmarks, seekAndPlay, editingBookmark?.id],
  );

  const nudgeCaptureStart = useCallback(
    (deltaSeconds: number) => {
      const current = parseTime(capStart) ?? editingBookmark?.start ?? 0;
      const end = capUseEnd ? parseTime(capEnd) : editingBookmark?.end ?? null;
      const newStart = clampStart(current + deltaSeconds, end);
      setCapStart(fmtTime(newStart));
      seekAndPlay(newStart);
      if (editingBookmark) {
        const updated = bookmarksRef.current.map((b) =>
          b.id === editingBookmark.id ? { ...b, start: newStart } : b,
        );
        persistBookmarks(updated);
        setEditingBookmark((prev) =>
          prev ? { ...prev, start: newStart } : prev,
        );
      }
    },
    [capStart, capEnd, capUseEnd, clampStart, editingBookmark, persistBookmarks, seekAndPlay],
  );

  const updateCueTitle = useCallback(
    (bm: Bookmark, title: string) => {
      const updated = bookmarksRef.current.map((b) =>
        b.id === bm.id ? { ...b, title } : b,
      );
      persistBookmarks(updated);
    },
    [persistBookmarks],
  );

  const updateCueStart = useCallback(
    (bm: Bookmark, start: number) => {
      const newStart = clampStart(start, bm.end);
      const updated = bookmarksRef.current.map((b) =>
        b.id === bm.id ? { ...b, start: newStart } : b,
      );
      persistBookmarks(updated);
      setActiveBookmarkId(bm.id);
      seekAndPlay(newStart);
    },
    [clampStart, persistBookmarks, seekAndPlay],
  );

  const activeBookmark = bookmarks.find((b) => b.id === activeBookmarkId);
  const loopLabel =
    activeBookmark?.end != null && activeBookmark.loop
      ? activeBookmark.title
      : null;

  const openCaptureNew = useCallback(() => {
    if (!playerReadyRef.current || !playerRef.current) return;
    setEditingBookmark(null);
    setCaptureVariant("full");
    const t = playerRef.current.getCurrentTime();
    setCapStart(fmtTime(t));
    setCapUseEnd(false);
    setCapEnd("");
    setCapTitle("");
    setCapDesc("");
    setShowCapture(true);
  }, []);

  const openCaptureDetails = useCallback((bm: Bookmark) => {
    setEditingBookmark(bm);
    setCaptureVariant("details");
    setCapStart(fmtTime(bm.start));
    setCapUseEnd(bm.end != null);
    setCapEnd(bm.end != null ? fmtTime(bm.end) : "");
    setCapTitle(bm.title);
    setCapDesc(bm.desc || "");
    setShowCapture(true);
  }, []);

  const saveCapture = () => {
    const start =
      captureVariant === "details" && editingBookmark
        ? editingBookmark.start
        : parseTime(capStart);
    if (start == null) return;

    let end: number | null = null;
    if (capUseEnd) {
      end = parseTime(capEnd);
      if (end == null || end <= start) return;
    }

    const defaultTitle = `Cue at ${fmtTime(start)}`;
    const titleVal = capTitle.trim() || defaultTitle;

    if (editingBookmark) {
      const updated = bookmarks.map((b) =>
        b.id === editingBookmark.id
          ? {
              ...b,
              end,
              loop: end != null ? (b.end != null ? b.loop : true) : false,
              desc: capDesc.trim(),
              ...(captureVariant === "full"
                ? {
                    start,
                    title: capTitle.trim() || b.title,
                  }
                : {}),
            }
          : b,
      );
      persistBookmarks(updated);
    } else {
      persistBookmarks([
        ...bookmarks,
        {
          id: genId("bm"),
          start,
          end,
          loop: end != null,
          title: titleVal,
          desc: capDesc.trim(),
        },
      ]);
    }

    setShowCapture(false);
    setEditingBookmark(null);
  };

  const selectCue = (bm: Bookmark) => {
    if (!playerReadyRef.current || !playerRef.current) return;
    setActiveBookmarkId(bm.id);
    playerRef.current.seekTo(bm.start, true);
    playerRef.current.playVideo();
  };

  const jumpToActiveOrLast = () => {
    let bm = activeBookmark ?? null;
    if (!bm && bookmarks.length > 0) bm = bookmarks[bookmarks.length - 1];
    if (!bm || !playerRef.current) return;
    setActiveBookmarkId(bm.id);
    playerRef.current.seekTo(bm.start, true);
    playerRef.current.playVideo();
  };

  const toggleLoop = (bm: Bookmark) => {
    const updated = bookmarks.map((b) =>
      b.id === bm.id ? { ...b, loop: !b.loop } : b,
    );
    persistBookmarks(updated);
  };

  const deleteCue = (bm: Bookmark) => {
    persistBookmarks(bookmarks.filter((b) => b.id !== bm.id));
    if (activeBookmarkId === bm.id) setActiveBookmarkId(null);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (!playerReadyRef.current || !playerRef.current) return;

      if (e.code === "Space") {
        e.preventDefault();
        const state = playerRef.current.getPlayerState();
        if (state === YT.PlayerState.PLAYING) playerRef.current.pauseVideo();
        else playerRef.current.playVideo();
      } else if (e.key === "c" || e.key === "C") {
        addQuickCue();
      } else if (e.key === "b" || e.key === "B") {
        openCaptureNew();
      } else if (e.key === "ArrowRight") {
        playerRef.current.seekTo(playerRef.current.getCurrentTime() + 5, true);
      } else if (e.key === "ArrowLeft") {
        playerRef.current.seekTo(
          Math.max(0, playerRef.current.getCurrentTime() - 5),
          true,
        );
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openCaptureNew, addQuickCue]);

  return (
    <>
      <div className="flex items-center gap-2.5 mb-3.5 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="font-mono text-xs text-ink cursor-pointer flex items-center gap-1 uppercase tracking-wide bg-transparent border-0 p-0 hover:text-accent-dim shrink-0"
        >
          ← Library
        </button>
        <span className="text-[15px] font-semibold truncate flex-1 min-w-0">
          {title}
        </span>
        <Button
          variant="ghost"
          size="small"
          onClick={() =>
            downloadExport(
              exportVideo(videoId, title),
              `cuedeck-${videoId}.json`,
            )
          }
          className="shrink-0"
        >
          Export
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start min-h-0">
        <CueSidebar
          bookmarks={bookmarks}
          activeBookmarkId={activeBookmarkId}
          onQuickCue={addQuickCue}
          onAddDetailed={openCaptureNew}
          onSelectCue={selectCue}
          onUpdateCueTitle={updateCueTitle}
          onUpdateCueStart={updateCueStart}
          onEditCueDetails={openCaptureDetails}
          onDeleteCue={deleteCue}
          onToggleLoop={toggleLoop}
          onNudgeCue={nudgeCueStart}
        />

        <div className="flex-1 min-w-0 w-full">
          <VideoDeck
            deckStatus={deckStatus}
            statusBig={statusBig}
            statusSub={statusSub}
          />
          <Transport
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            disabled={!playerReady}
            bookmarks={bookmarks}
            loopLabel={loopLabel}
            playbackRate={playbackRate}
            onPlayPause={() => {
              if (!playerRef.current) return;
              const state = playerRef.current.getPlayerState();
              if (state === YT.PlayerState.PLAYING) playerRef.current.pauseVideo();
              else playerRef.current.playVideo();
            }}
            onSeek={(t) => setCurrentTime(t)}
            onScrubStart={() => {
              isScrubbingRef.current = true;
            }}
            onScrubEnd={(t) => {
              isScrubbingRef.current = false;
              setCurrentTime(t);
              playerRef.current?.seekTo(t, true);
            }}
            onBackToBookmark={jumpToActiveOrLast}
            onPlaybackRateChange={(rate) => {
              setPlaybackRate(rate);
              playerRef.current?.setPlaybackRate(rate);
            }}
          />
          {showCapture && (
            <CaptureBar
              variant={captureVariant}
              start={capStart}
              end={capEnd}
              title={capTitle}
              desc={capDesc}
              useEnd={capUseEnd}
              onStartChange={setCapStart}
              onEndChange={setCapEnd}
              onTitleChange={setCapTitle}
              onDescChange={setCapDesc}
              onUseEndChange={(v) => {
                setCapUseEnd(v);
                if (v && !capEnd && playerRef.current) {
                  setCapEnd(fmtTime(playerRef.current.getCurrentTime()));
                }
              }}
              onNudgeStart={nudgeCaptureStart}
              onSave={saveCapture}
              onCancel={() => {
                setShowCapture(false);
                setEditingBookmark(null);
              }}
            />
          )}
        </div>
      </div>

      <p className="font-mono text-[10px] text-line mt-4 text-center tracking-wide">
        <kbd className="bg-paper-dim border border-line px-1 rounded-sm font-mono">
          space
        </kbd>{" "}
        play/pause &nbsp;
        <kbd className="bg-paper-dim border border-line px-1 rounded-sm font-mono">
          C
        </kbd>{" "}
        quick cue &nbsp;
        <kbd className="bg-paper-dim border border-line px-1 rounded-sm font-mono">
          B
        </kbd>{" "}
        cue w/ details &nbsp;
        <kbd className="bg-paper-dim border border-line px-1 rounded-sm font-mono">
          ←
        </kbd>
        /
        <kbd className="bg-paper-dim border border-line px-1 rounded-sm font-mono">
          →
        </kbd>{" "}
        seek 5s
      </p>
    </>
  );
}
