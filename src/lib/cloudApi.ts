import type { UserLibrarySnapshot } from "./types";
import { normalizeUserLibrarySnapshot } from "./librarySnapshot";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchUserLibraryOnce(): Promise<UserLibrarySnapshot> {
  const res = await fetch("/api/library", {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    throw new Error("Could not load your library.");
  }

  const data = normalizeUserLibrarySnapshot(await res.json());
  if (!data) {
    throw new Error("Could not parse your library.");
  }

  return data;
}

export async function fetchUserLibrary(): Promise<UserLibrarySnapshot> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (attempt > 0) {
      await wait(250 * attempt);
    }

    try {
      return await fetchUserLibraryOnce();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Could not load library.");
      if (lastError.message !== "Unauthorized") {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error("Could not load your library.");
}

export async function saveUserLibrary(
  snapshot: UserLibrarySnapshot,
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (attempt > 0) {
      await wait(250 * attempt);
    }

    try {
      const res = await fetch("/api/library", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
        credentials: "same-origin",
      });

      if (res.status === 401) {
        lastError = new Error("Unauthorized");
        continue;
      }

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(
          detail ? `Could not save your library: ${detail}` : "Could not save your library.",
        );
      }

      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Could not save library.");
      if (lastError.message !== "Unauthorized") {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error("Could not save your library.");
}
