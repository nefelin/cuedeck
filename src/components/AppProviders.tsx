"use client";

import { SessionProvider } from "next-auth/react";
import { CloudSyncProvider } from "@/components/CloudSyncProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CloudSyncProvider>{children}</CloudSyncProvider>
    </SessionProvider>
  );
}
