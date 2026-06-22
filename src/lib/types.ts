export interface LibraryEntry {
  videoId: string;
  title: string;
  lastOpened?: number;
}

export interface Bookmark {
  id: string;
  start: number;
  end: number | null;
  loop: boolean;
  title: string;
  desc: string;
}

export type View = "library" | "player";

export type DeckStatusKind = "loading" | "error";
