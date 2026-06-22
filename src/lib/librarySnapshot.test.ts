import { describe, expect, it } from "vitest";
import { normalizeUserLibrarySnapshot } from "./librarySnapshot";

describe("normalizeUserLibrarySnapshot", () => {
  it("parses valid snapshot objects", () => {
    const snapshot = {
      library: [{ videoId: "abc", title: "Test" }],
      cues: { abc: [] },
    };
    expect(normalizeUserLibrarySnapshot(snapshot)).toEqual(snapshot);
  });

  it("parses JSON strings from the database", () => {
    const snapshot = {
      library: [{ videoId: "abc", title: "Test" }],
      cues: {},
    };
    expect(normalizeUserLibrarySnapshot(JSON.stringify(snapshot))).toEqual(
      snapshot,
    );
  });

  it("rejects invalid payloads", () => {
    expect(normalizeUserLibrarySnapshot(null)).toBeNull();
    expect(normalizeUserLibrarySnapshot({ cues: {} })).toBeNull();
    expect(normalizeUserLibrarySnapshot("not-json")).toBeNull();
  });

  it("defaults missing cues to an empty object", () => {
    expect(
      normalizeUserLibrarySnapshot({
        library: [{ videoId: "abc", title: "Test" }],
      }),
    ).toEqual({
      library: [{ videoId: "abc", title: "Test" }],
      cues: {},
    });
  });
});
