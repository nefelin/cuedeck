import { beforeEach, describe, expect, it } from "vitest";
import {
  activateAuthenticatedMode,
  activateGuestMode,
  loadLibrary,
  resetStorageForTests,
} from "./storage";

describe("authenticated storage", () => {
  beforeEach(() => {
    resetStorageForTests();
  });

  it("serves hydrated cloud data from memory", () => {
    activateAuthenticatedMode({
      library: [{ videoId: "abc", title: "Cloud video" }],
      cues: {},
    });

    expect(loadLibrary()).toEqual([{ videoId: "abc", title: "Cloud video" }]);
  });

  it("clears authenticated data when returning to guest mode", () => {
    activateAuthenticatedMode({
      library: [{ videoId: "abc", title: "Cloud video" }],
      cues: {},
    });
    activateGuestMode();

    expect(loadLibrary()).toEqual([]);
  });
});
