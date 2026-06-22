import type { SnapshotMergePreview } from "./exportImport";
import {
  applySnapshotMerge,
  previewSnapshotMerge,
} from "./exportImport";
import type { UserLibrarySnapshot } from "./types";
import { snapshotIsEmpty } from "./librarySnapshot";

export type LoginLibraryResolution =
  | {
      action: "apply";
      snapshot: UserLibrarySnapshot;
      /** When false, cloud data is trusted as-is and must not be re-written. */
      persist: boolean;
    }
  | {
      action: "merge";
      cloud: UserLibrarySnapshot;
      local: UserLibrarySnapshot;
      preview: SnapshotMergePreview;
    };

export function resolveLoginLibrary(
  cloud: UserLibrarySnapshot,
  local: UserLibrarySnapshot,
): LoginLibraryResolution {
  if (snapshotIsEmpty(local)) {
    return { action: "apply", snapshot: cloud, persist: false };
  }

  if (snapshotIsEmpty(cloud)) {
    return { action: "apply", snapshot: local, persist: true };
  }

  const preview = previewSnapshotMerge(cloud, local);
  if (preview.conflicts.length === 0) {
    return {
      action: "apply",
      snapshot: applySnapshotMerge(cloud, local, "add-new"),
      persist: true,
    };
  }

  return { action: "merge", cloud, local, preview };
}
