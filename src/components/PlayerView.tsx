"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CaptureModal } from "@/components/CaptureModal";
import { CueSidebar } from "@/components/CueSidebar";
import { Transport } from "@/components/Transport";
import { VideoDeck } from "@/components/VideoDeck";
import { whenYTReady, useYouTubeApi } from "@/hooks/useYouTubeApi";
import {
  loadBookmarksFor,
  saveBookmarksFor,
  upsertLibraryEntry,
} from "@/lib/storage";
import type { Bookmark, DeckStatusKind } from "@/lib/types";
import { fmtTime, genId, parseTime } from "@/lib/youtube";

interface PlayerViewProps {
  videoId: string;
  titleHint: string;
  onTitleChange?: (title: string) => void;
}

export function PlayerView({
  videoId,
  titleHint,
  onTitleChange,
}: PlayerViewProps) {
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
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [capStart, setCapStart] = useState("");
  const [capEnd, setCapEnd] = useState("");
  const [capTitle, setCapTitle] = useState("");
  const [capDesc, setCapDesc] = useState("");
  const [capUseEnd, setCapUseEnd] = useState(false);
  const [capLoop, setCapLoop] = useState(false);

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
    onTitleChange?.(title);
  }, [title, onTitleChange]);

  useEffect(() => {
    const onStorageUpdate = () => {
      setBookmarks(loadBookmarksFor(videoId));
    };
    window.addEventListener("cuedeck-storage-updated", onStorageUpdate);
    return () =>
      window.removeEventListener("cuedeck-storage-updated", onStorageUpdate);
  }, [videoId]);

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

  const nudgeCaptureStart = useCallback(
    (deltaSeconds: number) => {
      const current = parseTime(capStart) ?? editingBookmark?.start ?? 0;
      const end = capUseEnd ? parseTime(capEnd) : editingBookmark?.end ?? null;
      const newStart = clampStart(current + deltaSeconds, end);
      setCapStart(fmtTime(newStart));
      seekAndPlay(newStart);
    },
    [capStart, capEnd, capUseEnd, clampStart, editingBookmark, seekAndPlay],
  );

  const playFromCaptureStart = useCallback(() => {
    const t = parseTime(capStart);
    if (t == null) return;
    const end = capUseEnd ? parseTime(capEnd) : editingBookmark?.end ?? null;
    seekAndPlay(clampStart(t, end));
  }, [capStart, capEnd, capUseEnd, clampStart, editingBookmark, seekAndPlay]);

  const pausePlayback = useCallback(() => {
    playerRef.current?.pauseVideo();
  }, []);

  const activeBookmark = bookmarks.find((b) => b.id === activeBookmarkId);
  const loopLabel =
    activeBookmark?.end != null && activeBookmark.loop
      ? activeBookmark.title
      : null;

  const openCaptureForm = useCallback(
    (bm: Bookmark | null) => {
      setEditingBookmark(bm);
      if (bm) {
        setCapStart(fmtTime(bm.start));
        setCapUseEnd(bm.end != null);
        setCapEnd(bm.end != null ? fmtTime(bm.end) : "");
        setCapTitle(bm.title);
        setCapDesc(bm.desc || "");
        setCapLoop(bm.loop);
      } else {
        if (!playerReadyRef.current || !playerRef.current) return;
        const t = playerRef.current.getCurrentTime();
        setCapStart(fmtTime(t));
        setCapUseEnd(false);
        setCapEnd("");
        setCapTitle("");
        setCapDesc("");
        setCapLoop(false);
      }
      setShowCapture(true);
    },
    [],
  );

  const openCaptureNew = useCallback(() => {
    openCaptureForm(null);
  }, [openCaptureForm]);

  const openCaptureEdit = useCallback(
    (bm: Bookmark) => {
      openCaptureForm(bm);
    },
    [openCaptureForm],
  );

  const saveCapture = () => {
    const start = parseTime(capStart);
    if (start == null) return;

    let end: number | null = null;
    if (capUseEnd) {
      end = parseTime(capEnd);
      if (end == null || end <= start) return;
    }

    const defaultTitle = `Cue at ${fmtTime(start)}`;
    const titleVal = capTitle.trim() || defaultTitle;
    const loop = capUseEnd && capLoop;

    if (editingBookmark) {
      const updated = bookmarks.map((b) =>
        b.id === editingBookmark.id
          ? {
              ...b,
              start,
              end,
              loop,
              title: capTitle.trim() || b.title,
              desc: capDesc.trim(),
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
          loop,
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
    <div className="flex flex-col flex-1 min-h-0 max-lg:min-h-0">
      <div className="flex flex-col lg:flex-row-reverse flex-1 min-h-0 min-w-0 gap-0 lg:gap-4 overflow-hidden">
        <div className="shrink-0 min-w-0 lg:flex-1 lg:min-w-0">
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
        </div>

        <CueSidebar
          className="min-h-0 min-w-0 max-lg:flex-1"
          bookmarks={bookmarks}
          activeBookmarkId={activeBookmarkId}
          onQuickCue={addQuickCue}
          onAddDetailed={openCaptureNew}
          onSelectCue={selectCue}
          onEditCue={openCaptureEdit}
          onDeleteCue={deleteCue}
        />
      </div>

      {showCapture && (
        <CaptureModal
          title={editingBookmark ? "Edit cue" : "New cue"}
          start={capStart}
          end={capEnd}
          cueTitle={capTitle}
          desc={capDesc}
          useEnd={capUseEnd}
          loop={capLoop}
          onStartChange={setCapStart}
          onEndChange={setCapEnd}
          onTitleChange={setCapTitle}
          onDescChange={setCapDesc}
          onUseEndChange={(v) => {
            setCapUseEnd(v);
            if (v && !capEnd && playerRef.current) {
              setCapEnd(fmtTime(playerRef.current.getCurrentTime()));
            }
            if (!v) setCapLoop(false);
          }}
          onLoopChange={setCapLoop}
          onNudgeStart={nudgeCaptureStart}
          onPlayFromStart={playFromCaptureStart}
          onPause={pausePlayback}
          onSave={saveCapture}
          onCancel={() => {
            setShowCapture(false);
            setEditingBookmark(null);
          }}
        />
      )}

      <p className="hidden lg:block font-mono text-[10px] text-line mt-3 text-center tracking-wide shrink-0">
        <kbd className="bg-paper-dim border border-line px-1 rounded-sm font-mono">space</kbd>{" "}
        play/pause ·{" "}
        <kbd className="bg-paper-dim border border-line px-1 rounded-sm font-mono">C</kbd> quick
        cue ·{" "}
        <kbd className="bg-paper-dim border border-line px-1 rounded-sm font-mono">B</kbd> new cue
      </p>
    </div>
  );
}
