import type { UserLibrarySnapshot } from "./types";

const emptySnapshot: UserLibrarySnapshot = { library: [], cues: {} };

export async function fetchUserLibrary(): Promise<UserLibrarySnapshot> {
  const res = await fetch("/api/library", { cache: "no-store" });
  if (res.status === 401) {
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    throw new Error("Could not load your library.");
  }
  const data = (await res.json()) as UserLibrarySnapshot;
  return {
    library: Array.isArray(data.library) ? data.library : [],
    cues: data.cues && typeof data.cues === "object" ? data.cues : {},
  };
}

export async function saveUserLibrary(
  snapshot: UserLibrarySnapshot,
): Promise<void> {
  const res = await fetch("/api/library", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot),
  });
  if (res.status === 401) {
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    throw new Error("Could not save your library.");
  }
}

export { emptySnapshot };
