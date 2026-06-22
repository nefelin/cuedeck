"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { ImportConflictDialog, ImportErrorDialog } from "@/components/ImportDialog";
import type { ImportPreview, ImportConflictStrategy } from "@/lib/exportImport";
import {
  applyImport,
  downloadExport,
  exportFullLibrary,
  parseImportFile,
  previewImport,
} from "@/lib/exportImport";
import type { LibraryEntry } from "@/lib/types";
import {
  loadLibrary,
  loadBookmarksFor,
  removeLibraryEntry,
  upsertLibraryEntry,
} from "@/lib/storage";
import { extractVideoId, fetchVideoTitle } from "@/lib/youtube";

interface LibraryViewProps {
  onOpenVideo: (videoId: string, title: string) => void;
}

export function LibraryView({ onOpenVideo }: LibraryViewProps) {
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [addError, setAddError] = useState("");
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    const lib = loadLibrary().sort(
      (a, b) => (b.lastOpened ?? 0) - (a.lastOpened ?? 0),
    );
    setLibrary(lib);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    window.addEventListener("cuedeck-storage-updated", refresh);
    return () => window.removeEventListener("cuedeck-storage-updated", refresh);
  }, [refresh]);

  const handleAdd = () => {
    setAddError("");
    const id = extractVideoId(urlInput);
    if (!id) {
      setAddError("That doesn't look like a YouTube link or video ID.");
      return;
    }

    const existing = loadLibrary().find((v) => v.videoId === id);
    const entry: LibraryEntry = {
      videoId: id,
      title: existing?.title ?? `Video ${id}`,
      lastOpened: existing?.lastOpened ?? Date.now(),
    };
    upsertLibraryEntry(entry);
    refresh();
    setUrlInput("");

    fetchVideoTitle(id).then((title) => {
      if (title) {
        upsertLibraryEntry({ videoId: id, title });
        refresh();
      }
    });

    onOpenVideo(id, entry.title);
  };

  const handleRename = (entry: LibraryEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = prompt("Rename this video", entry.title || entry.videoId);
    if (next != null && next.trim() !== "") {
      upsertLibraryEntry({ videoId: entry.videoId, title: next.trim() });
      refresh();
    }
  };

  const handleRemove = (entry: LibraryEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      confirm(
        `Remove "${entry.title || entry.videoId}" and all its bookmarks?`,
      )
    ) {
      removeLibraryEntry(entry.videoId);
      refresh();
    }
  };

  const handleExport = () => {
    downloadExport(exportFullLibrary());
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const raw = await file.text();
      const data = parseImportFile(raw);
      const preview = previewImport(data);

      if (preview.conflicts.length > 0) {
        setImportPreview(preview);
      } else {
        applyImport(data, "add-new");
        refresh();
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed.");
    }
  };

  const finishImport = (strategy: ImportConflictStrategy) => {
    if (!importPreview) return;
    if (strategy !== "abort") {
      applyImport(importPreview.data, strategy);
      refresh();
    }
    setImportPreview(null);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportFile}
      />

      {importPreview && (
        <ImportConflictDialog
          conflicts={importPreview.conflicts}
          newVideoCount={importPreview.newVideoCount}
          updatedVideoCount={importPreview.updatedVideoCount}
          onChoose={finishImport}
        />
      )}

      {importError && (
        <ImportErrorDialog
          message={importError}
          onClose={() => setImportError(null)}
        />
      )}
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Paste a YouTube link or video ID…"
          autoComplete="off"
          className="flex-1 font-mono text-[13px] px-3 py-2.5 bg-white border-[1.5px] border-ink text-ink outline-none focus:shadow-[2px_2px_0_var(--color-ink)] placeholder:text-line"
        />
        <Button variant="accent" onClick={handleAdd}>
          Add video
        </Button>
      </div>
      <p className="font-mono text-[11px] text-accent-dim m-0 mb-4 min-h-3.5">
        {addError}
      </p>

      <div className="flex items-baseline justify-between mt-7 mb-3 border-b-2 border-ink pb-2 gap-3 flex-wrap">
        <h2 className="text-sm m-0 uppercase tracking-widest font-bold">
          Your videos
        </h2>
        <div className="flex items-center gap-2 ml-auto">
          <span className="font-mono text-[11px] text-muted">
            {library.length} saved
          </span>
          <Button
            variant="ghost"
            size="small"
            onClick={handleImportClick}
          >
            Import
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={handleExport}
            disabled={library.length === 0}
          >
            Export
          </Button>
        </div>
      </div>

      {library.length === 0 ? (
        <div className="font-mono text-xs text-line py-10 px-5 text-center border-[1.5px] border-dashed border-line">
          <div className="font-display text-[15px] text-ink font-semibold mb-1.5">
            No videos yet
          </div>
          Paste a YouTube link above to start your first practice session.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5">
          {library.map((entry) => {
            const bmCount = loadBookmarksFor(entry.videoId).length;
            return (
              <div
                key={entry.videoId}
                role="button"
                tabIndex={0}
                onClick={() => onOpenVideo(entry.videoId, entry.title)}
                onKeyDown={(e) =>
                  e.key === "Enter" && onOpenVideo(entry.videoId, entry.title)
                }
                className="bg-white border-[1.5px] border-ink cursor-pointer flex flex-col transition-[transform,box-shadow] duration-75 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--color-accent)]"
              >
                <div
                  className="w-full aspect-video bg-ink bg-cover bg-center relative shrink-0"
                  style={{
                    backgroundImage: `url('https://i.ytimg.com/vi/${entry.videoId}/mqdefault.jpg')`,
                  }}
                >
                  {bmCount > 0 && (
                    <span className="absolute bottom-1.5 right-1.5 font-mono text-[10px] bg-accent text-white px-1.5 py-0.5">
                      {bmCount} {bmCount === 1 ? "cue" : "cues"}
                    </span>
                  )}
                </div>
                <div className="p-2.5 pb-3 flex flex-col gap-1.5 flex-1">
                  <div className="text-[13px] font-semibold leading-snug line-clamp-2">
                    {entry.title || entry.videoId}
                  </div>
                  <div className="font-mono text-[10px] text-line">
                    {entry.videoId}
                  </div>
                  <div className="flex gap-1.5 mt-auto pt-1">
                    <button
                      type="button"
                      title="Rename"
                      onClick={(e) => handleRename(entry, e)}
                      className="w-[26px] h-[26px] flex items-center justify-center bg-transparent border-[1.5px] border-line cursor-pointer text-xs hover:border-ink hover:bg-paper-dim"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      title="Remove"
                      onClick={(e) => handleRemove(entry, e)}
                      className="w-[26px] h-[26px] flex items-center justify-center bg-transparent border-[1.5px] border-line cursor-pointer text-xs hover:border-accent hover:text-accent"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
