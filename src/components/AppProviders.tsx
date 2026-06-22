"use client";

import { SessionProvider } from "next-auth/react";
import { LibraryProvider } from "@/context/LibraryContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LibraryProvider>{children}</LibraryProvider>
    </SessionProvider>
  );
}
