"use client";

import { signIn } from "next-auth/react";
import { useLibrary } from "@/context/LibraryContext";

export function SignInBanner() {
  const { isGuest, isReady } = useLibrary();

  if (!isReady || !isGuest) return null;

  return (
    <div
      role="status"
      className="mb-4 border-[1.5px] border-accent bg-accent/15 px-3 py-3 flex flex-wrap items-center justify-between gap-3 shadow-[2px_2px_0_var(--color-accent)]"
    >
      <p className="m-0 font-mono text-[11px] text-ink leading-relaxed">
        <span className="font-bold uppercase tracking-wide">Not signed in.</span>{" "}
        Your videos and cues are saved only on this device. Clear your browser
        data or switch devices and you may lose them. Sign in to keep everything
        synced to your account.
      </p>
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="font-mono text-[10px] uppercase tracking-wide px-2.5 py-1.5 border border-edge bg-white hover:bg-paper-dim cursor-pointer shrink-0"
      >
        Sign in with Google
      </button>
    </div>
  );
}
