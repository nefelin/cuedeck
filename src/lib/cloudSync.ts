import type { Bookmark, UserLibrarySnapshot } from "./types";
import {
  loadBookmarksFor,
  loadLibrary,
  replaceAllData,
  snapshotIsEmpty,
} from "./storage";

export function snapshotFromLocal(): UserLibrarySnapshot {
  const library = loadLibrary();
  const cues: Record<string, Bookmark[]> = {};
  for (const entry of library) {
    cues[entry.videoId] = loadBookmarksFor(entry.videoId);
  }
  return { library, cues };
}

export function applySnapshotToLocal(snapshot: UserLibrarySnapshot): void {
  replaceAllData(snapshot.library, snapshot.cues);
}

export async function pullFromCloud(): Promise<UserLibrarySnapshot | null> {
  const res = await fetch("/api/library", { cache: "no-store" });
  if (res.status === 401) return null;
  if (!res.ok) {
    throw new Error("Could not load your library from the cloud.");
  }
  const data = (await res.json()) as UserLibrarySnapshot | null;
  if (!data || snapshotIsEmpty(data)) return null;
  return data;
}

export async function pushToCloud(): Promise<void> {
  const res = await fetch("/api/library", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshotFromLocal()),
  });
  if (res.status === 401) return;
  if (!res.ok) {
    throw new Error("Could not save your library to the cloud.");
  }
}

export function localHasData(): boolean {
  return !snapshotIsEmpty(snapshotFromLocal());
}
