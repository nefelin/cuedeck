export function extractVideoId(input: string): string | null {
  const trimmed = (input || "").trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const u = new URL(trimmed);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1, 12);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const m = u.pathname.match(/\/(embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
      if (m) return m[2];
    }
  } catch {
    /* not a full URL */
  }

  const m2 = trimmed.match(/[a-zA-Z0-9_-]{11}/);
  return m2 ? m2[0] : null;
}

export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  return `${m}:${String(ss).padStart(2, "0")}`;
}

export function parseTime(str: string | null | undefined): number | null {
  if (str == null) return null;
  const trimmed = str.trim();
  if (trimmed === "") return null;

  const parts = trimmed.split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || isNaN(Number(p)))) return null;

  let sec = 0;
  if (parts.length === 3) {
    sec = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  } else if (parts.length === 2) {
    sec = Number(parts[0]) * 60 + Number(parts[1]);
  } else if (parts.length === 1) {
    sec = Number(parts[0]);
  } else {
    return null;
  }
  return sec;
}

export function genId(prefix = "id"): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

export async function fetchVideoTitle(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    return data.title ?? null;
  } catch {
    return null;
  }
}
