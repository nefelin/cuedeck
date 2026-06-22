import { describe, expect, it } from "vitest";
import { resolveLoginLibrary } from "./libraryHydration";
import type { UserLibrarySnapshot } from "./types";

const cloud: UserLibrarySnapshot = {
  library: [{ videoId: "abc", title: "Cloud video", lastOpened: 100 }],
  cues: {
    abc: [
      {
        id: "c1",
        start: 10,
        end: null,
        loop: false,
        title: "Cloud cue",
        desc: "",
      },
    ],
  },
};

const local: UserLibrarySnapshot = {
  library: [{ videoId: "xyz", title: "Local video", lastOpened: 200 }],
  cues: {
    xyz: [
      {
        id: "l1",
        start: 5,
        end: null,
        loop: false,
        title: "Local cue",
        desc: "",
      },
    ],
  },
};

describe("resolveLoginLibrary", () => {
  it("loads cloud only when local is empty without persisting", () => {
    const result = resolveLoginLibrary(cloud, { library: [], cues: {} });
    expect(result).toEqual({
      action: "apply",
      snapshot: cloud,
      persist: false,
    });
  });

  it("uploads local when cloud is empty", () => {
    const result = resolveLoginLibrary(
      { library: [], cues: {} },
      local,
    );
    expect(result).toEqual({
      action: "apply",
      snapshot: local,
      persist: true,
    });
  });

  it("merges non-conflicting libraries automatically", () => {
    const result = resolveLoginLibrary(cloud, local);
    expect(result.action).toBe("apply");
    if (result.action !== "apply") return;
    expect(result.persist).toBe(true);
    expect(result.snapshot.library.map((entry) => entry.videoId).sort()).toEqual(
      ["abc", "xyz"],
    );
    expect(result.snapshot.cues.abc).toHaveLength(1);
    expect(result.snapshot.cues.xyz).toHaveLength(1);
  });

  it("requires merge dialog when cue ids conflict", () => {
    const conflictingLocal: UserLibrarySnapshot = {
      library: [{ videoId: "abc", title: "Local rename", lastOpened: 300 }],
      cues: {
        abc: [
          {
            id: "c1",
            start: 99,
            end: null,
            loop: false,
            title: "Conflicting cue",
            desc: "",
          },
        ],
      },
    };

    const result = resolveLoginLibrary(cloud, conflictingLocal);
    expect(result.action).toBe("merge");
    if (result.action !== "merge") return;
    expect(result.preview.conflicts).toHaveLength(1);
    expect(result.preview.conflicts[0].videoId).toBe("abc");
  });
});
