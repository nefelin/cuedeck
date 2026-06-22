import {
  findLegacyUuidLibraries,
  getUserLibrary,
  saveUserLibrary,
} from "./db";
import { emptyLibrarySnapshot, snapshotIsEmpty } from "./librarySnapshot";
import { looksLikeGoogleSub } from "./userId";
import type { UserLibrarySnapshot } from "./types";

export async function migrateLibraryUserId(
  canonicalUserId: string,
  legacyUserId: string,
): Promise<UserLibrarySnapshot | null> {
  if (canonicalUserId === legacyUserId) return null;

  const canonical = await getUserLibrary(canonicalUserId);
  if (canonical && !snapshotIsEmpty(canonical)) return canonical;

  const legacy = await getUserLibrary(legacyUserId);
  if (!legacy || snapshotIsEmpty(legacy)) return null;

  await saveUserLibrary(canonicalUserId, legacy);
  return legacy;
}

/** One-time migration when Auth.js stored libraries under a random UUID. */
export async function migrateSingleOrphanedLegacyLibrary(
  canonicalUserId: string,
): Promise<UserLibrarySnapshot | null> {
  if (!looksLikeGoogleSub(canonicalUserId)) return null;

  const existing = await getUserLibrary(canonicalUserId);
  if (existing && !snapshotIsEmpty(existing)) return null;

  const legacyRows = await findLegacyUuidLibraries();
  if (legacyRows.length !== 1) return null;

  const { userId: legacyUserId, data } = legacyRows[0];
  if (legacyUserId === canonicalUserId) return null;

  await saveUserLibrary(canonicalUserId, data);
  return data;
}

export async function resolveLibraryForUser(
  userId: string,
  options?: { legacyUserId?: string; allowSingleLegacy?: boolean },
): Promise<UserLibrarySnapshot> {
  let data = await getUserLibrary(userId);
  if (data && !snapshotIsEmpty(data)) return data;

  if (options?.legacyUserId && options.legacyUserId !== userId) {
    const migrated = await migrateLibraryUserId(userId, options.legacyUserId);
    if (migrated) return migrated;
    data = await getUserLibrary(userId);
    if (data && !snapshotIsEmpty(data)) return data;
  }

  if (options?.allowSingleLegacy) {
    const migrated = await migrateSingleOrphanedLegacyLibrary(userId);
    if (migrated) return migrated;
  }

  return data ?? emptyLibrarySnapshot;
}
