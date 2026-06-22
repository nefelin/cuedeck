import { describe, expect, it } from "vitest";
import { applySnapshotMerge } from "./exportImport";
import { resolveLoginLibrary } from "./libraryHydration";
import type { UserLibrarySnapshot } from "./types";

describe("cross-device sync scenarios", () => {
  const deviceA: UserLibrarySnapshot = {
    library: [{ videoId: "abc123", title: "Practice video", lastOpened: 500 }],
    cues: {
      abc123: [
        {
          id: "cue-1",
          start: 12,
          end: null,
          loop: false,
          title: "Intro",
          desc: "",
        },
      ],
    },
  };

  it("loads account library on a fresh device with no local data", () => {
    const result = resolveLoginLibrary(deviceA, { library: [], cues: {} });
    expect(result).toEqual({
      action: "apply",
      snapshot: deviceA,
      persist: false,
    });
  });

  it("uploads local-only library when the account is empty", () => {
    const result = resolveLoginLibrary({ library: [], cues: {} }, deviceA);
    expect(result).toEqual({
      action: "apply",
      snapshot: deviceA,
      persist: true,
    });
  });

  it("merges new device videos into an existing account library", () => {
    const deviceBLocal: UserLibrarySnapshot = {
      library: [{ videoId: "xyz789", title: "Other video", lastOpened: 900 }],
      cues: { xyz789: [] },
    };

    const merged = applySnapshotMerge(deviceA, deviceBLocal, "add-new");
    expect(merged.library.map((entry) => entry.videoId).sort()).toEqual([
      "abc123",
      "xyz789",
    ]);
  });
});
