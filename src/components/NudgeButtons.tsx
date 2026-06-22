"use client";

interface NudgeButtonsProps {
  onNudge: (deltaSeconds: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  label?: string;
  center?: React.ReactNode;
}

export function NudgeButtons({
  onNudge,
  disabled,
  size = "sm",
  label = "Start",
  center,
}: NudgeButtonsProps) {
  const btnClass =
    size === "sm"
      ? "font-mono text-[10px] px-1 py-0.5 text-muted hover:text-ink disabled:opacity-30 cursor-pointer bg-transparent border-0 shrink-0"
      : "font-mono text-xs px-2 py-1 text-muted hover:text-ink disabled:opacity-30 cursor-pointer bg-transparent border border-line hover:border-ink shrink-0";

  const handle = (direction: -1 | 1) => (e: React.MouseEvent) => {
    const step = e.shiftKey ? 1 : 2;
    onNudge(direction * step);
  };

  return (
    <div className="flex items-center gap-0.5">
      {label && (
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted mr-0.5">
          {label}
        </span>
      )}
      <button
        type="button"
        title="Nudge start earlier (−2s, −1s with Shift)"
        disabled={disabled}
        onClick={handle(-1)}
        className={btnClass}
      >
        ◀
      </button>
      {center}
      <button
        type="button"
        title="Nudge start later (+2s, +1s with Shift)"
        disabled={disabled}
        onClick={handle(1)}
        className={btnClass}
      >
        ▶
      </button>
    </div>
  );
}
