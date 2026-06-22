import { describe, expect, it } from "vitest";
import { getGoogleUserId, isUuid, looksLikeGoogleSub } from "./userId";

describe("userId helpers", () => {
  it("detects Auth.js UUID user ids", () => {
    expect(isUuid("425123d4-d02e-4c87-8791-5e15739471b5")).toBe(true);
    expect(isUuid("123456789012345678901")).toBe(false);
  });

  it("detects Google sub ids", () => {
    expect(looksLikeGoogleSub("123456789012345678901")).toBe(true);
    expect(looksLikeGoogleSub("425123d4-d02e-4c87-8791-5e15739471b5")).toBe(
      false,
    );
  });

  it("prefers profile.sub for Google user id", () => {
    expect(
      getGoogleUserId(
        { providerAccountId: "provider-id" },
        { sub: "google-sub" },
      ),
    ).toBe("google-sub");
  });
});
