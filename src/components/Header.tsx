"use client";

import type { AppMenuItem } from "@/components/AppMenu";
import { AppMenu } from "@/components/AppMenu";

interface HeaderProps {
  onHome: () => void;
  compact?: boolean;
  menuItems: AppMenuItem[];
}

export function Header({ onHome, compact, menuItems }: HeaderProps) {
  return (
    <header
      className={`flex items-center gap-2 border-b border-edge shrink-0 min-w-0 ${
        compact ? "pb-2 mb-2" : "pb-3.5 mb-5"
      }`}
    >
      <button
        type="button"
        onClick={onHome}
        aria-label={compact ? "Back to library" : "Cuedeck home"}
        className="flex items-baseline gap-2 cursor-pointer bg-transparent border-0 p-0 shrink-0"
      >
        <span className="font-mono text-[13px] bg-ink text-paper px-1.5 py-0.5 tracking-wide">
          ▮▮
        </span>
        <h1
          className={`m-0 font-bold tracking-tight ${
            compact ? "text-lg" : "text-[22px]"
          }`}
        >
          Cuedeck
        </h1>
      </button>

      {!compact && (
        <div className="font-mono text-[11px] text-muted uppercase tracking-wide hidden md:block ml-2">
          bookmark &amp; loop tool for practice
        </div>
      )}

      <div className="ml-auto shrink-0">
        <AppMenu items={menuItems} />
      </div>
    </header>
  );
}
