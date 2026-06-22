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
import { useSession } from "next-auth/react";
import { ImportConflictDialog } from "@/components/ImportDialog";
import { fetchUserLibrary, saveUserLibrary } from "@/lib/cloudApi";
import type { ImportConflictStrategy, SnapshotMergePreview } from "@/lib/exportImport";
import {
  applySnapshotMerge,
  previewSnapshotMerge,
} from "@/lib/exportImport";
import type { UserLibrarySnapshot } from "@/lib/types";
import {
  activateAuthenticatedMode,
  activateGuestMode,
  clearLocalStorage,
  flushToCloud,
  snapshotFromLocal,
  snapshotIsEmpty,
} from "@/lib/storage";

interface LibraryContextValue {
  isReady: boolean;
  isGuest: boolean;
  isAuthenticated: boolean;
}

const LibraryContext = createContext<LibraryContextValue>({
  isReady: false,
  isGuest: true,
  isAuthenticated: false,
});

interface PendingMerge {
  cloud: UserLibrarySnapshot;
  local: UserLibrarySnapshot;
  userId: string;
  preview: SnapshotMergePreview;
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [isReady, setIsReady] = useState(false);
  const [pendingMerge, setPendingMerge] = useState<PendingMerge | null>(null);
  const hydratedUserRef = useRef<string | null>(null);
  const awaitingMergeRef = useRef(false);

  const finishHydration = useCallback(
    async (snapshot: UserLibrarySnapshot, userId: string) => {
      await saveUserLibrary(snapshot);
      clearLocalStorage();
      activateAuthenticatedMode(snapshot);
      hydratedUserRef.current = userId;
      awaitingMergeRef.current = false;
      setPendingMerge(null);
      setIsReady(true);
    },
    [],
  );

  const hydrate = useCallback(
    async (userId: string) => {
      const cloud = await fetchUserLibrary();
      const local = snapshotFromLocal();

      if (snapshotIsEmpty(local)) {
        await finishHydration(cloud, userId);
        return;
      }

      if (snapshotIsEmpty(cloud)) {
        await finishHydration(local, userId);
        return;
      }

      const preview = previewSnapshotMerge(cloud, local);
      if (preview.conflicts.length === 0) {
        const merged = applySnapshotMerge(cloud, local, "add-new");
        await finishHydration(merged, userId);
        return;
      }

      setPendingMerge({ cloud, local, userId, preview });
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
        await finishHydration(snapshot, pendingMerge.userId);
      } catch (err) {
        console.error("Login merge failed:", err);
        activateGuestMode();
        awaitingMergeRef.current = false;
        setPendingMerge(null);
        setIsReady(true);
      }
    },
    [pendingMerge, finishHydration],
  );

  useEffect(() => {
    if (status === "loading") {
      setIsReady(false);
      return;
    }

    if (status === "unauthenticated") {
      hydratedUserRef.current = null;
      awaitingMergeRef.current = false;
      setPendingMerge(null);
      activateGuestMode();
      setIsReady(true);
      return;
    }

    const userId = session?.user?.id;
    if (!userId) return;

    if (hydratedUserRef.current === userId) {
      setIsReady(true);
      return;
    }

    if (awaitingMergeRef.current) {
      setIsReady(false);
      return;
    }

    setIsReady(false);
    let cancelled = false;

    void hydrate(userId).catch((err) => {
      console.error("Library hydration failed:", err);
      if (!cancelled) {
        activateGuestMode();
        awaitingMergeRef.current = false;
        setPendingMerge(null);
        setIsReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.id, hydrate]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const flushOnHide = () => {
      if (document.visibilityState === "hidden") {
        void flushToCloud();
      }
    };

    window.addEventListener("beforeunload", flushOnHide);
    document.addEventListener("visibilitychange", flushOnHide);
    return () => {
      window.removeEventListener("beforeunload", flushOnHide);
      document.removeEventListener("visibilitychange", flushOnHide);
    };
  }, [status]);

  const value = useMemo(
    () => ({
      isReady,
      isGuest: status !== "authenticated",
      isAuthenticated: status === "authenticated",
    }),
    [isReady, status],
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
