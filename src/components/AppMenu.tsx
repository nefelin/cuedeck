"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
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

function MenuTrigger({
  loading,
  image,
  name,
  email,
}: {
  loading: boolean;
  image?: string | null;
  name?: string | null;
  email?: string | null;
}) {
  if (loading) {
    return (
      <span className="block w-8 h-8 rounded-full border border-line bg-paper-dim shrink-0" />
    );
  }

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        className="block w-8 h-8 rounded-full border border-line object-cover shrink-0"
      />
    );
  }

  const initial = (name ?? email ?? "?").charAt(0).toUpperCase();

  return (
    <span className="block w-8 h-8 rounded-full border-[1.5px] border-line bg-white font-mono text-[11px] text-muted flex items-center justify-center shrink-0">
      {initial}
    </span>
  );
}

export function AppMenu({ items, className }: AppMenuProps) {
  const { data: session, status } = useSession();
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

  const user = session?.user;
  const signedIn = status === "authenticated" && !!user;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={signedIn ? "Account menu" : "Menu"}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="p-0 bg-transparent border-0 cursor-pointer shrink-0 hover:opacity-80"
      >
        <MenuTrigger
          loading={status === "loading"}
          image={user?.image}
          name={user?.name}
          email={user?.email}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[200px] bg-paper border border-edge shadow-[3px_3px_0_var(--color-edge)] py-1"
        >
          {signedIn && (
            <div className="px-3 py-2 border-b border-edge mb-1">
              {user.name && (
                <div className="text-xs font-medium truncate">{user.name}</div>
              )}
              {user.email && (
                <div className="font-mono text-[10px] text-muted truncate">
                  {user.email}
                </div>
              )}
            </div>
          )}

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
