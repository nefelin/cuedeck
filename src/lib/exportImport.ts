import type { Bookmark, LibraryEntry, UserLibrarySnapshot } from "./types";
import { loadBookmarksFor, loadLibrary, saveBookmarksFor, upsertLibraryEntry } from "./storage";

export const EXPORT_SCHEMA_VERSION = 1;

export interface ExportedVideo {
  videoId: string;
  title: string;
  url: string;
  cues: Bookmark[];
}

export interface CuedeckExport {
  schemaVersion: number;
  exportedAt: string;
  videos: ExportedVideo[];
}

export type ImportConflictStrategy = "abort" | "add-new" | "replace-conflicts";

export interface ImportConflictSummary {
  videoId: string;
  title: string;
  conflictingCueIds: string[];
}

export interface ImportPreview {
  data: CuedeckExport;
  conflicts: ImportConflictSummary[];
  newVideoCount: number;
  updatedVideoCount: number;
}

function youtubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function buildExport(videos: LibraryEntry[]): CuedeckExport {
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    videos: videos.map((entry) => ({
      videoId: entry.videoId,
      title: entry.title,
      url: youtubeUrl(entry.videoId),
      cues: loadBookmarksFor(entry.videoId),
    })),
  };
}

export function exportFullLibrary(): CuedeckExport {
  return buildExport(loadLibrary());
}

export function exportVideo(videoId: string, title: string): CuedeckExport {
  return buildExport([{ videoId, title }]);
}

export function exportFilename(
  data: CuedeckExport,
  filename?: string,
): string {
  const stamp = data.exportedAt.slice(0, 10);
  return filename ?? `cuedeck-export-${stamp}.json`;
}

export function downloadExport(data: CuedeckExport, filename?: string): void {
  const name = exportFilename(data, filename);
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function shareExport(
  data: CuedeckExport,
  filename?: string,
): Promise<void> {
  const name = exportFilename(data, filename);
  const json = JSON.stringify(data, null, 2);
  const file = new File([json], name, { type: "application/json" });

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      const shareData: ShareData = {
        title: "Cuedeck",
        text: "Cuedeck cues export",
      };

      if (navigator.canShare?.({ files: [file] })) {
        shareData.files = [file];
      } else {
        shareData.text = json;
      }

      await navigator.share(shareData);
      return;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }

  downloadExport(data, name);
}

function isBookmark(value: unknown): value is Bookmark {
  if (!value || typeof value !== "object") return false;
  const b = value as Bookmark;
  return (
    typeof b.id === "string" &&
    typeof b.start === "number" &&
    (b.end === null || typeof b.end === "number") &&
    typeof b.loop === "boolean" &&
    typeof b.title === "string" &&
    typeof b.desc === "string"
  );
}

function isExportedVideo(value: unknown): value is ExportedVideo {
  if (!value || typeof value !== "object") return false;
  const v = value as ExportedVideo;
  return (
    typeof v.videoId === "string" &&
    typeof v.title === "string" &&
    Array.isArray(v.cues) &&
    v.cues.every(isBookmark)
  );
}

export function parseImportFile(raw: string): CuedeckExport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("That file is not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Unrecognized export format.");
  }

  const data = parsed as CuedeckExport;
  if (data.schemaVersion !== EXPORT_SCHEMA_VERSION) {
    throw new Error(`Unsupported export version (${data.schemaVersion ?? "unknown"}).`);
  }
  if (!Array.isArray(data.videos) || data.videos.length === 0) {
    throw new Error("Export contains no videos.");
  }
  if (!data.videos.every(isExportedVideo)) {
    throw new Error("Export is missing video or cue fields.");
  }

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: typeof data.exportedAt === "string" ? data.exportedAt : new Date().toISOString(),
    videos: data.videos.map((v) => ({
      videoId: v.videoId,
      title: v.title,
      url: v.url || youtubeUrl(v.videoId),
      cues: v.cues,
    })),
  };
}

export function previewImport(data: CuedeckExport): ImportPreview {
  const lib = loadLibrary();
  const libById = new Map(lib.map((v) => [v.videoId, v]));
  const conflicts: ImportConflictSummary[] = [];
  let newVideoCount = 0;
  let updatedVideoCount = 0;

  for (const video of data.videos) {
    const existing = libById.get(video.videoId);
    if (existing) {
      updatedVideoCount++;
    } else {
      newVideoCount++;
    }

    const existingCues = loadBookmarksFor(video.videoId);
    const existingIds = new Set(existingCues.map((c) => c.id));
    const conflictingCueIds = video.cues
      .map((c) => c.id)
      .filter((id) => existingIds.has(id));

    if (conflictingCueIds.length > 0) {
      conflicts.push({
        videoId: video.videoId,
        title: video.title || existing?.title || video.videoId,
        conflictingCueIds,
      });
    }
  }

  return { data, conflicts, newVideoCount, updatedVideoCount };
}

function mergeCues(
  existing: Bookmark[],
  imported: Bookmark[],
  strategy: ImportConflictStrategy,
): Bookmark[] {
  if (strategy === "abort") return existing;

  const existingIds = new Set(existing.map((c) => c.id));

  if (strategy === "add-new") {
    const toAdd = imported.filter((c) => !existingIds.has(c.id));
    return [...existing, ...toAdd].sort((a, b) => a.start - b.start);
  }

  const importedById = new Map(imported.map((c) => [c.id, c]));
  const kept = existing.filter((c) => !importedById.has(c.id));
  return [...kept, ...imported].sort((a, b) => a.start - b.start);
}

export interface SnapshotMergePreview {
  conflicts: ImportConflictSummary[];
  newVideoCount: number;
  updatedVideoCount: number;
}

export function previewSnapshotMerge(
  cloud: UserLibrarySnapshot,
  local: UserLibrarySnapshot,
): SnapshotMergePreview {
  const cloudById = new Map(cloud.library.map((entry) => [entry.videoId, entry]));
  const conflicts: ImportConflictSummary[] = [];
  let newVideoCount = 0;
  let updatedVideoCount = 0;

  for (const entry of local.library) {
    const existing = cloudById.get(entry.videoId);
    if (existing) {
      updatedVideoCount++;
    } else {
      newVideoCount++;
    }

    const cloudCues = cloud.cues[entry.videoId] ?? [];
    const localCues = local.cues[entry.videoId] ?? [];
    const existingIds = new Set(cloudCues.map((cue) => cue.id));
    const conflictingCueIds = localCues
      .map((cue) => cue.id)
      .filter((id) => existingIds.has(id));

    if (conflictingCueIds.length > 0) {
      conflicts.push({
        videoId: entry.videoId,
        title: entry.title || existing?.title || entry.videoId,
        conflictingCueIds,
      });
    }
  }

  return { conflicts, newVideoCount, updatedVideoCount };
}

export function applySnapshotMerge(
  cloud: UserLibrarySnapshot,
  local: UserLibrarySnapshot,
  strategy: ImportConflictStrategy,
): UserLibrarySnapshot {
  if (strategy === "abort") {
    return {
      library: cloud.library.map((entry) => ({ ...entry })),
      cues: Object.fromEntries(
        Object.entries(cloud.cues).map(([videoId, cues]) => [
          videoId,
          cues.map((cue) => ({ ...cue })),
        ]),
      ),
    };
  }

  const libraryById = new Map(
    cloud.library.map((entry) => [entry.videoId, { ...entry }]),
  );

  for (const entry of local.library) {
    const existing = libraryById.get(entry.videoId);
    if (existing) {
      libraryById.set(entry.videoId, {
        ...existing,
        title: entry.title || existing.title,
        lastOpened: Math.max(existing.lastOpened ?? 0, entry.lastOpened ?? 0),
      });
    } else {
      libraryById.set(entry.videoId, { ...entry });
    }
  }

  const cues: Record<string, Bookmark[]> = {};
  const videoIds = new Set([
    ...cloud.library.map((entry) => entry.videoId),
    ...local.library.map((entry) => entry.videoId),
  ]);

  for (const videoId of videoIds) {
    const cloudCues = cloud.cues[videoId] ?? [];
    const localCues = local.cues[videoId] ?? [];
    if (localCues.length === 0) {
      cues[videoId] = cloudCues.map((cue) => ({ ...cue }));
    } else if (cloudCues.length === 0) {
      cues[videoId] = localCues.map((cue) => ({ ...cue }));
    } else {
      cues[videoId] = mergeCues(cloudCues, localCues, strategy);
    }
  }

  return {
    library: Array.from(libraryById.values()),
    cues,
  };
}

export function applyImport(
  data: CuedeckExport,
  strategy: ImportConflictStrategy,
): void {
  if (strategy === "abort") return;

  for (const video of data.videos) {
    upsertLibraryEntry({
      videoId: video.videoId,
      title: video.title,
    });

    const existing = loadBookmarksFor(video.videoId);
    const merged = mergeCues(existing, video.cues, strategy);
    saveBookmarksFor(video.videoId, merged);
  }
}

export function totalConflictCount(conflicts: ImportConflictSummary[]): number {
  return conflicts.reduce((sum, c) => sum + c.conflictingCueIds.length, 0);
}
