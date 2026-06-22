"use client";

import { AuthButton } from "@/components/AuthButton";

interface HeaderProps {
  onHome: () => void;
  compact?: boolean;
}

export function Header({ onHome, compact }: HeaderProps) {
  return (
    <header
      className={`flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink shrink-0 ${
        compact ? "pb-2 mb-2" : "pb-3.5 mb-5"
      }`}
    >
      <button
        type="button"
        onClick={onHome}
        className="flex items-baseline gap-2 cursor-pointer bg-transparent border-0 p-0"
      >
        <span className="font-mono text-[13px] bg-ink text-paper px-1.5 py-0.5 tracking-wide">
          ▮▮
        </span>
        <h1 className={`m-0 font-bold tracking-tight ${compact ? "text-lg" : "text-[22px]"}`}>
          Loopstation
        </h1>
      </button>
      <div className="flex items-center gap-3 ml-auto">
        {!compact && (
          <div className="font-mono text-[11px] text-muted uppercase tracking-wide hidden md:block">
            bookmark &amp; loop tool for practice
          </div>
        )}
        <AuthButton />
      </div>
    </header>
  );
}
