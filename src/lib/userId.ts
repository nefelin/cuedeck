export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function looksLikeGoogleSub(value: string): boolean {
  return /^\d+$/.test(value);
}

export function getGoogleUserId(
  account: { providerAccountId?: string } | null | undefined,
  profile: unknown,
): string | undefined {
  if (profile && typeof profile === "object" && "sub" in profile) {
    return String(profile.sub);
  }
  return account?.providerAccountId;
}
