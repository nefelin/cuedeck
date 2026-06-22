import { getToken } from "next-auth/jwt";
import { auth } from "@/auth";
import { saveUserLibrary } from "@/lib/db";
import { resolveLibraryForUser } from "@/lib/libraryMigration";
import type { UserLibrarySnapshot } from "@/lib/types";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    });
    const legacyUserId =
      typeof token?.legacySub === "string" ? token.legacySub : undefined;

    const data = await resolveLibraryForUser(session.user.id, {
      legacyUserId,
      allowSingleLegacy: true,
    });
    return Response.json(data);
  } catch (err) {
    console.error("GET /api/library failed:", err);
    return Response.json({ error: "Failed to load library." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: UserLibrarySnapshot;
  try {
    body = (await request.json()) as UserLibrarySnapshot;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!Array.isArray(body.library) || typeof body.cues !== "object") {
    return Response.json({ error: "Invalid library payload." }, { status: 400 });
  }

  try {
    await saveUserLibrary(session.user.id, body);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/library failed:", err);
    return Response.json({ error: "Failed to save library." }, { status: 500 });
  }
}
