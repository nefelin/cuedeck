import type { Bookmark, LibraryEntry, UserLibrarySnapshot } from "./types";

const LIB_KEY = "loopstation_library_v1";
const BM_PREFIX = "loopstation_bookmarks_";

const listeners = new Set<() => void>();

function bookmarkKey(videoId: string): string {
  return BM_PREFIX + videoId;
}

function notifyChange(): void {
  listeners.forEach((fn) => fn());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cuedeck-storage-updated"));
  }
}

export function onStorageChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function loadLibrary(): LibraryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIB_KEY);
    return raw ? (JSON.parse(raw) as LibraryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveLibrary(lib: LibraryEntry[]): void {
  localStorage.setItem(LIB_KEY, JSON.stringify(lib));
  notifyChange();
}

export function upsertLibraryEntry(
  entry: Partial<LibraryEntry> & { videoId: string },
): LibraryEntry[] {
  const lib = loadLibrary();
  const idx = lib.findIndex((v) => v.videoId === entry.videoId);
  if (idx >= 0) {
    lib[idx] = { ...lib[idx], ...entry };
  } else {
    lib.push({
      videoId: entry.videoId,
      title: entry.title ?? `Video ${entry.videoId}`,
      lastOpened: entry.lastOpened,
    });
  }
  saveLibrary(lib);
  return lib;
}

export function removeLibraryEntry(videoId: string): LibraryEntry[] {
  const lib = loadLibrary().filter((v) => v.videoId !== videoId);
  saveLibrary(lib);
  localStorage.removeItem(bookmarkKey(videoId));
  return lib;
}

export function loadBookmarksFor(videoId: string): Bookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(bookmarkKey(videoId));
    return raw ? (JSON.parse(raw) as Bookmark[]) : [];
  } catch {
    return [];
  }
}

export function saveBookmarksFor(videoId: string, list: Bookmark[]): void {
  localStorage.setItem(bookmarkKey(videoId), JSON.stringify(list));
  notifyChange();
}

export function replaceAllData(
  library: LibraryEntry[],
  cues: Record<string, Bookmark[]>,
): void {
  if (typeof window === "undefined") return;

  const keepVideoIds = new Set(library.map((entry) => entry.videoId));
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(BM_PREFIX) && !keepVideoIds.has(key.slice(BM_PREFIX.length))) {
      localStorage.removeItem(key);
    }
  }

  localStorage.setItem(LIB_KEY, JSON.stringify(library));
  for (const entry of library) {
    localStorage.setItem(
      bookmarkKey(entry.videoId),
      JSON.stringify(cues[entry.videoId] ?? []),
    );
  }
  notifyChange();
}

export function snapshotIsEmpty(snapshot: UserLibrarySnapshot): boolean {
  if (snapshot.library.length > 0) return false;
  return !Object.values(snapshot.cues).some((cues) => cues.length > 0);
}
