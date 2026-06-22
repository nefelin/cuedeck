import { neon } from "@neondatabase/serverless";
import {
  normalizeUserLibrarySnapshot,
  snapshotIsEmpty,
} from "./librarySnapshot";
import type { UserLibrarySnapshot } from "./types";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured.");
  }
  return neon(url);
}

export async function getUserLibrary(
  userId: string,
): Promise<UserLibrarySnapshot | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT data FROM user_libraries WHERE user_id = ${userId} LIMIT 1
  `;

  if (rows.length === 0) return null;

  return normalizeUserLibrarySnapshot(rows[0].data);
}

export async function saveUserLibrary(
  userId: string,
  snapshot: UserLibrarySnapshot,
): Promise<void> {
  const sql = getSql();
  const payload = JSON.stringify(snapshot);

  await sql.query(
    `INSERT INTO user_libraries (user_id, data, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id) DO UPDATE
     SET data = EXCLUDED.data, updated_at = NOW()`,
    [userId, payload],
  );
}

export async function findLegacyUuidLibraries(): Promise<
  Array<{ userId: string; data: UserLibrarySnapshot }>
> {
  const sql = getSql();
  const rows = await sql`
    SELECT user_id, data FROM user_libraries
    WHERE user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  `;

  const libraries: Array<{ userId: string; data: UserLibrarySnapshot }> = [];

  for (const row of rows) {
    const data = normalizeUserLibrarySnapshot(row.data);
    if (!data || snapshotIsEmpty(data)) continue;
    libraries.push({ userId: String(row.user_id), data });
  }

  return libraries;
}
