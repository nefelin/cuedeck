"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <span className="font-mono text-[10px] text-muted uppercase tracking-wide">
        …
      </span>
    );
  }

  if (!session?.user) {
    return (
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="font-mono text-[10px] uppercase tracking-wide px-2 py-1 border-[1.5px] border-ink bg-white hover:bg-paper-dim cursor-pointer"
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {session.user.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={session.user.image}
          alt=""
          className="w-6 h-6 rounded-full border border-line"
        />
      )}
      <span className="font-mono text-[10px] text-muted max-w-[120px] truncate hidden sm:inline">
        {session.user.name ?? session.user.email}
      </span>
      <button
        type="button"
        onClick={() => signOut()}
        className="font-mono text-[10px] uppercase tracking-wide px-2 py-1 border-[1.5px] border-line bg-transparent hover:border-ink cursor-pointer"
      >
        Sign out
      </button>
    </div>
  );
}
