"use client";

import { Button } from "@/components/Button";
import type { ImportConflictSummary, ImportConflictStrategy } from "@/lib/exportImport";
import { totalConflictCount } from "@/lib/exportImport";

interface ImportConflictDialogProps {
  conflicts: ImportConflictSummary[];
  newVideoCount: number;
  updatedVideoCount: number;
  onChoose: (strategy: ImportConflictStrategy) => void;
  title?: string;
  intro?: string;
  abortLabel?: string;
}

export function ImportConflictDialog({
  conflicts,
  newVideoCount,
  updatedVideoCount,
  onChoose,
  title = "Import conflicts",
  intro,
  abortLabel = "Abort",
}: ImportConflictDialogProps) {
  const conflictCount = totalConflictCount(conflicts);

  const defaultIntro = `Found ${conflictCount} cue${conflictCount === 1 ? "" : "s"} with IDs that already exist across ${conflicts.length} video${conflicts.length === 1 ? "" : "s"}.`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-ink/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-conflict-title"
    >
      <div className="w-full max-w-md bg-paper border border-edge p-5 shadow-[4px_4px_0_var(--color-edge)]">
        <h2
          id="import-conflict-title"
          className="text-base font-bold m-0 mb-2"
        >
          {title}
        </h2>
        <p className="text-sm text-[#5c5b54] m-0 mb-3 leading-relaxed">
          {intro ?? defaultIntro}{" "}
          {newVideoCount > 0 && (
            <>
              {newVideoCount} new video{newVideoCount === 1 ? "" : "s"} will be
              added.{" "}
            </>
          )}
          {updatedVideoCount > 0 && (
            <>
              {updatedVideoCount} existing video
              {updatedVideoCount === 1 ? "" : "s"} will receive cues.
            </>
          )}
        </p>

        <ul className="font-mono text-[11px] text-muted m-0 mb-4 pl-4 max-h-32 overflow-y-auto space-y-1">
          {conflicts.map((c) => (
            <li key={c.videoId}>
              {c.title}: {c.conflictingCueIds.length} conflict
              {c.conflictingCueIds.length === 1 ? "" : "s"}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          <Button variant="accent" onClick={() => onChoose("replace-conflicts")}>
            Replace conflicts
          </Button>
          <Button onClick={() => onChoose("add-new")}>
            Add new only
          </Button>
          <Button variant="ghost" onClick={() => onChoose("abort")}>
            {abortLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ImportErrorDialogProps {
  message: string;
  onClose: () => void;
}

export function ImportErrorDialog({ message, onClose }: ImportErrorDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-ink/40"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm bg-paper border border-edge p-5 shadow-[4px_4px_0_var(--color-edge)]">
        <h2 className="text-base font-bold m-0 mb-2">Import failed</h2>
        <p className="text-sm text-[#5c5b54] m-0 mb-4">{message}</p>
        <Button onClick={onClose}>OK</Button>
      </div>
    </div>
  );
}
