import type { Bookmark, LibraryEntry } from "./types";

const LIB_KEY = "loopstation_library_v1";
const BM_PREFIX = "loopstation_bookmarks_";

function bookmarkKey(videoId: string): string {
  return BM_PREFIX + videoId;
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
}

export function upsertLibraryEntry(entry: LibraryEntry): LibraryEntry[] {
  const lib = loadLibrary();
  const idx = lib.findIndex((v) => v.videoId === entry.videoId);
  if (idx >= 0) {
    lib[idx] = { ...lib[idx], ...entry };
  } else {
    lib.push(entry);
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
}
