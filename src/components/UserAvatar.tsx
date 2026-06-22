"use client";

import { signIn, useSession } from "next-auth/react";

interface UserAvatarProps {
  className?: string;
}

export function UserAvatar({ className }: UserAvatarProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <span
        className={`w-7 h-7 rounded-full border border-line bg-paper-dim shrink-0 ${className ?? ""}`}
      />
    );
  }

  if (!session?.user) {
    return (
      <button
        type="button"
        aria-label="Sign in"
        title="Sign in"
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className={`w-7 h-7 rounded-full border-[1.5px] border-line bg-white font-mono text-[10px] text-muted flex items-center justify-center cursor-pointer hover:border-ink shrink-0 ${className ?? ""}`}
      >
        ?
      </button>
    );
  }

  if (session.user.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={session.user.image}
        alt=""
        title={session.user.name ?? session.user.email ?? "Signed in"}
        className={`w-7 h-7 rounded-full border border-line object-cover shrink-0 ${className ?? ""}`}
      />
    );
  }

  const initial = (session.user.name ?? session.user.email ?? "?")
    .charAt(0)
    .toUpperCase();

  return (
    <span
      title={session.user.name ?? session.user.email ?? "Signed in"}
      className={`w-7 h-7 rounded-full border border-line bg-paper-dim font-mono text-[10px] text-ink flex items-center justify-center shrink-0 ${className ?? ""}`}
    >
      {initial}
    </span>
  );
}
