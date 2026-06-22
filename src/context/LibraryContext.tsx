"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getSession, useSession } from "next-auth/react";
import { ImportConflictDialog } from "@/components/ImportDialog";
import { fetchUserLibrary, saveUserLibrary } from "@/lib/cloudApi";
import type { ImportConflictStrategy } from "@/lib/exportImport";
import { applySnapshotMerge } from "@/lib/exportImport";
import { resolveLoginLibrary } from "@/lib/libraryHydration";
import type { UserLibrarySnapshot } from "@/lib/types";
import {
  activateAuthenticatedMode,
  activateGuestMode,
  clearLocalStorage,
  flushToCloud,
  getSnapshot,
  snapshotFromLocal,
} from "@/lib/storage";

interface LibraryContextValue {
  isReady: boolean;
  isGuest: boolean;
  isAuthenticated: boolean;
  hydrationError: string | null;
  retryHydration: () => void;
}

const LibraryContext = createContext<LibraryContextValue>({
  isReady: false,
  isGuest: true,
  isAuthenticated: false,
  hydrationError: null,
  retryHydration: () => {},
});

interface PendingMerge {
  cloud: UserLibrarySnapshot;
  local: UserLibrarySnapshot;
  userId: string;
  preview: import("@/lib/exportImport").SnapshotMergePreview;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForSessionUserId(
  expectedUserId: string,
  attempts = 8,
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const session = await getSession();
    if (session?.user?.id === expectedUserId) return;
    await wait(200);
  }
  throw new Error("Session not ready");
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [isReady, setIsReady] = useState(false);
  const [hydrationError, setHydrationError] = useState<string | null>(null);
  const [pendingMerge, setPendingMerge] = useState<PendingMerge | null>(null);
  const [hydrationNonce, setHydrationNonce] = useState(0);
  const hydratedUserRef = useRef<string | null>(null);
  const awaitingMergeRef = useRef(false);
  const hydrateRunRef = useRef(0);

  const finishHydration = useCallback(
    async (
      snapshot: UserLibrarySnapshot,
      userId: string,
      persist: boolean,
    ) => {
      if (persist) {
        await saveUserLibrary(snapshot);
      }
      clearLocalStorage();
      activateAuthenticatedMode(snapshot);
      hydratedUserRef.current = userId;
      awaitingMergeRef.current = false;
      setPendingMerge(null);
      setHydrationError(null);
      setIsReady(true);
    },
    [],
  );

  const hydrate = useCallback(
    async (userId: string, runId: number) => {
      await waitForSessionUserId(userId);
      if (hydrateRunRef.current !== runId) return;

      const cloud = await fetchUserLibrary();
      if (hydrateRunRef.current !== runId) return;

      const local = snapshotFromLocal();
      const resolution = resolveLoginLibrary(cloud, local);

      if (resolution.action === "apply") {
        await finishHydration(
          resolution.snapshot,
          userId,
          resolution.persist,
        );
        return;
      }

      setPendingMerge({
        cloud: resolution.cloud,
        local: resolution.local,
        userId,
        preview: resolution.preview,
      });
      awaitingMergeRef.current = true;
    },
    [finishHydration],
  );

  const handleMergeChoice = useCallback(
    async (strategy: ImportConflictStrategy) => {
      if (!pendingMerge) return;

      const snapshot =
        strategy === "abort"
          ? pendingMerge.cloud
          : applySnapshotMerge(
              pendingMerge.cloud,
              pendingMerge.local,
              strategy,
            );

      try {
        await finishHydration(snapshot, pendingMerge.userId, strategy !== "abort");
      } catch (err) {
        console.error("Login merge failed:", err);
        setHydrationError("Could not save your merged library. Try again.");
        awaitingMergeRef.current = false;
        setPendingMerge(null);
        setIsReady(false);
      }
    },
    [pendingMerge, finishHydration],
  );

  const retryHydration = useCallback(() => {
    hydratedUserRef.current = null;
    awaitingMergeRef.current = false;
    setPendingMerge(null);
    setHydrationError(null);
    setIsReady(false);
    setHydrationNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    if (status === "loading") {
      setIsReady(false);
      return;
    }

    if (status === "unauthenticated") {
      hydratedUserRef.current = null;
      awaitingMergeRef.current = false;
      setPendingMerge(null);
      setHydrationError(null);
      activateGuestMode();
      setIsReady(true);
      return;
    }

    const userId = session?.user?.id;
    if (!userId) return;

    if (hydratedUserRef.current === userId) {
      setIsReady(true);
      setHydrationError(null);
      return;
    }

    if (awaitingMergeRef.current) {
      setIsReady(false);
      return;
    }

    setIsReady(false);
    setHydrationError(null);
    const runId = hydrateRunRef.current + 1;
    hydrateRunRef.current = runId;
    let cancelled = false;

    void hydrate(userId, runId).catch((err) => {
      console.error("Library hydration failed:", err);
      if (!cancelled && hydrateRunRef.current === runId) {
        setHydrationError(
          "Could not load your library from your account. Check your connection and try again.",
        );
        setIsReady(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.id, hydrate, hydrationNonce]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const flushOnHide = () => {
      if (document.visibilityState === "hidden") {
        void flushToCloud();
      }
    };

    const refreshOnFocus = () => {
      if (document.visibilityState !== "visible") return;
      if (hydratedUserRef.current !== session?.user?.id) return;

      void fetchUserLibrary()
        .then((cloud) => {
          const resolution = resolveLoginLibrary(cloud, getSnapshot());
          if (resolution.action === "apply") {
            activateAuthenticatedMode(resolution.snapshot);
            if (resolution.persist) {
              void saveUserLibrary(resolution.snapshot);
            }
          }
        })
        .catch((err) => {
          console.error("Cloud refresh failed:", err);
        });
    };

    window.addEventListener("beforeunload", flushOnHide);
    document.addEventListener("visibilitychange", flushOnHide);
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      window.removeEventListener("beforeunload", flushOnHide);
      document.removeEventListener("visibilitychange", flushOnHide);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [status, session?.user?.id]);

  const value = useMemo(
    () => ({
      isReady,
      isGuest: status !== "authenticated",
      isAuthenticated: status === "authenticated",
      hydrationError,
      retryHydration,
    }),
    [isReady, status, hydrationError, retryHydration],
  );

  return (
    <LibraryContext.Provider value={value}>
      {pendingMerge && (
        <ImportConflictDialog
          title="Merge device library"
          intro="This device has cues that overlap with your account. Choose how to combine them."
          abortLabel="Keep account only"
          conflicts={pendingMerge.preview.conflicts}
          newVideoCount={pendingMerge.preview.newVideoCount}
          updatedVideoCount={pendingMerge.preview.updatedVideoCount}
          onChoose={(strategy) => void handleMergeChoice(strategy)}
        />
      )}
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary(): LibraryContextValue {
  return useContext(LibraryContext);
}
