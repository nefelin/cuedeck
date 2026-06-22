import { auth } from "@/auth";
import { getUserLibrary, saveUserLibrary } from "@/lib/db";
import type { UserLibrarySnapshot } from "@/lib/types";

const emptySnapshot: UserLibrarySnapshot = { library: [], cues: {} };

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getUserLibrary(session.user.id);
    return Response.json(data ?? emptySnapshot);
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
