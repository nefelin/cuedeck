import type { Bookmark, LibraryEntry, UserLibrarySnapshot } from "./types";
import { saveUserLibrary } from "./cloudApi";

const LIB_KEY = "loopstation_library_v1";
const BM_PREFIX = "loopstation_bookmarks_";

type StorageMode = "guest" | "authenticated";

const listeners = new Set<() => void>();
let mode: StorageMode = "guest";
let memorySnapshot: UserLibrarySnapshot = { library: [], cues: {} };
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let savePromise: Promise<void> | null = null;

function bookmarkKey(videoId: string): string {
  return BM_PREFIX + videoId;
}

function cloneSnapshot(snapshot: UserLibrarySnapshot): UserLibrarySnapshot {
  return {
    library: snapshot.library.map((entry) => ({ ...entry })),
    cues: Object.fromEntries(
      Object.entries(snapshot.cues).map(([videoId, cues]) => [
        videoId,
        cues.map((cue) => ({ ...cue })),
      ]),
    ),
  };
}

function notifyChange(): void {
  listeners.forEach((fn) => fn());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cuedeck-storage-updated"));
  }
}

function scheduleCloudSave(): void {
  if (mode !== "authenticated") return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void flushToCloud().catch((err) => {
      console.error("Cloud save failed:", err);
    });
  }, 400);
}

export function onStorageChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getStorageMode(): StorageMode {
  return mode;
}

export function activateGuestMode(): void {
  mode = "guest";
  memorySnapshot = { library: [], cues: {} };
}

/** @internal test helper */
export function resetStorageForTests(): void {
  mode = "guest";
  memorySnapshot = { library: [], cues: {} };
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  savePromise = null;
}

export function activateAuthenticatedMode(snapshot: UserLibrarySnapshot): void {
  mode = "authenticated";
  memorySnapshot = cloneSnapshot(snapshot);
  notifyChange();
}

export async function flushToCloud(): Promise<void> {
  if (mode !== "authenticated") return;
  if (savePromise) return savePromise;

  savePromise = saveUserLibrary(memorySnapshot).finally(() => {
    savePromise = null;
  });
  return savePromise;
}

function loadLibraryFromLocal(): LibraryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIB_KEY);
    return raw ? (JSON.parse(raw) as LibraryEntry[]) : [];
  } catch {
    return [];
  }
}

function loadBookmarksFromLocal(videoId: string): Bookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(bookmarkKey(videoId));
    return raw ? (JSON.parse(raw) as Bookmark[]) : [];
  } catch {
    return [];
  }
}

export function snapshotFromLocal(): UserLibrarySnapshot {
  const library = loadLibraryFromLocal();
  const cues: Record<string, Bookmark[]> = {};
  for (const entry of library) {
    cues[entry.videoId] = loadBookmarksFromLocal(entry.videoId);
  }
  return { library, cues };
}

export function clearLocalStorage(): void {
  if (typeof window === "undefined") return;

  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key === LIB_KEY || key?.startsWith(BM_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
}

export function loadLibrary(): LibraryEntry[] {
  if (mode === "authenticated") return memorySnapshot.library;
  return loadLibraryFromLocal();
}

export function sortLibraryByLastAccessed(
  library: LibraryEntry[],
): LibraryEntry[] {
  return [...library].sort(
    (a, b) => (b.lastOpened ?? 0) - (a.lastOpened ?? 0),
  );
}

function saveLibraryToLocal(lib: LibraryEntry[]): void {
  localStorage.setItem(LIB_KEY, JSON.stringify(lib));
}

export function saveLibrary(lib: LibraryEntry[]): void {
  if (mode === "authenticated") {
    memorySnapshot = { ...memorySnapshot, library: lib };
    scheduleCloudSave();
  } else {
    saveLibraryToLocal(lib);
  }
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
    if (mode === "authenticated" && !memorySnapshot.cues[entry.videoId]) {
      memorySnapshot.cues[entry.videoId] = [];
    }
  }
  saveLibrary(lib);
  return lib;
}

export function removeLibraryEntry(videoId: string): LibraryEntry[] {
  const lib = loadLibrary().filter((v) => v.videoId !== videoId);
  if (mode === "authenticated") {
    const cues = { ...memorySnapshot.cues };
    delete cues[videoId];
    memorySnapshot = { library: lib, cues };
    scheduleCloudSave();
  } else {
    saveLibraryToLocal(lib);
    localStorage.removeItem(bookmarkKey(videoId));
  }
  notifyChange();
  return lib;
}

export function loadBookmarksFor(videoId: string): Bookmark[] {
  if (mode === "authenticated") {
    return memorySnapshot.cues[videoId] ?? [];
  }
  return loadBookmarksFromLocal(videoId);
}

export function saveBookmarksFor(videoId: string, list: Bookmark[]): void {
  if (mode === "authenticated") {
    memorySnapshot = {
      ...memorySnapshot,
      cues: { ...memorySnapshot.cues, [videoId]: list },
    };
    scheduleCloudSave();
  } else {
    localStorage.setItem(bookmarkKey(videoId), JSON.stringify(list));
  }
  notifyChange();
}

export function replaceAllData(
  library: LibraryEntry[],
  cues: Record<string, Bookmark[]>,
): void {
  if (mode === "authenticated") {
    memorySnapshot = cloneSnapshot({ library, cues });
    scheduleCloudSave();
    notifyChange();
    return;
  }

  if (typeof window === "undefined") return;

  const keepVideoIds = new Set(library.map((entry) => entry.videoId));
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(BM_PREFIX) && !keepVideoIds.has(key.slice(BM_PREFIX.length))) {
      localStorage.removeItem(key);
    }
  }

  saveLibraryToLocal(library);
  for (const entry of library) {
    localStorage.setItem(
      bookmarkKey(entry.videoId),
      JSON.stringify(cues[entry.videoId] ?? []),
    );
  }
  notifyChange();
}

export { snapshotIsEmpty } from "./librarySnapshot";

export function getSnapshot(): UserLibrarySnapshot {
  if (mode === "authenticated") {
    return cloneSnapshot(memorySnapshot);
  }
  return snapshotFromLocal();
}
