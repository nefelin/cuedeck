"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface AppMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface AppMenuProps {
  items: AppMenuItem[];
  className?: string;
}

export function AppMenu({ items, className }: AppMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const runItem = (item: AppMenuItem) => {
    if (item.disabled) return;
    setOpen(false);
    item.onClick();
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 flex flex-col items-center justify-center gap-[3px] border-[1.5px] border-line bg-white hover:border-ink cursor-pointer shrink-0"
      >
        <span className="block w-3.5 h-0.5 bg-ink" />
        <span className="block w-3.5 h-0.5 bg-ink" />
        <span className="block w-3.5 h-0.5 bg-ink" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[168px] bg-paper border border-edge shadow-[3px_3px_0_var(--color-edge)] py-1"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => runItem(item)}
              className="block w-full text-left font-mono text-[11px] uppercase tracking-wide px-3 py-2 bg-transparent border-0 cursor-pointer hover:bg-paper-dim disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
