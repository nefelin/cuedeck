"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  applySnapshotToLocal,
  localHasData,
  pullFromCloud,
  pushToCloud,
} from "@/lib/cloudSync";
import { onStorageChange, snapshotIsEmpty } from "@/lib/storage";

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const syncedUserRef = useRef<string | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      syncedUserRef.current = null;
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const cloud = await pullFromCloud();
        if (cancelled) return;

        if (cloud && !snapshotIsEmpty(cloud)) {
          applySnapshotToLocal(cloud);
        } else if (localHasData()) {
          await pushToCloud();
        }

        syncedUserRef.current = "ready";
      } catch (err) {
        console.error("Cloud sync pull failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const schedulePush = () => {
      if (syncedUserRef.current !== "ready") return;
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      pushTimerRef.current = setTimeout(() => {
        void pushToCloud().catch((err) => {
          console.error("Cloud sync push failed:", err);
        });
      }, 800);
    };

    const unsubscribe = onStorageChange(schedulePush);
    return () => {
      unsubscribe();
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [status]);

  return children;
}
