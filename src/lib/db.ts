import { neon } from "@neondatabase/serverless";
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

  const data = rows[0].data as UserLibrarySnapshot | null;
  if (!data || !Array.isArray(data.library)) return null;

  return {
    library: data.library,
    cues: data.cues ?? {},
  };
}

export async function saveUserLibrary(
  userId: string,
  snapshot: UserLibrarySnapshot,
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO user_libraries (user_id, data, updated_at)
    VALUES (${userId}, ${snapshot}, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET data = EXCLUDED.data, updated_at = NOW()
  `;
}
