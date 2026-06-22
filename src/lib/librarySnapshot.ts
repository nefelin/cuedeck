import type { UserLibrarySnapshot } from "./types";

export const emptyLibrarySnapshot: UserLibrarySnapshot = {
  library: [],
  cues: {},
};

export function snapshotIsEmpty(snapshot: UserLibrarySnapshot): boolean {
  if (snapshot.library.length > 0) return false;
  return !Object.values(snapshot.cues).some((cues) => cues.length > 0);
}

export function normalizeUserLibrarySnapshot(
  raw: unknown,
): UserLibrarySnapshot | null {
  let value = raw;

  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== "object") return null;

  const data = value as UserLibrarySnapshot;
  if (!Array.isArray(data.library)) return null;

  return {
    library: data.library,
    cues:
      data.cues && typeof data.cues === "object" && !Array.isArray(data.cues)
        ? data.cues
        : {},
  };
}
