# Spec: Note visualization MVP

**Status:** Draft  
**Goal:** Show which piano keys are sounding at the current playhead time, synced to a YouTube video in Cuedeck, with a precomputed waveform for scrubbing and playback context.  
**Scope:** Offline CLI analysis + client-side JSON consumption. No server, no YouTube audio access.

---

## Problem

Cuedeck plays YouTube via the IFrame API. The browser cannot read audio from the embed (cross-origin). We cannot analyze the stream live in the UI.

**MVP approach:** Analyze audio once offline, ship a timestamped analysis file (note events + waveform peaks), and have the UI highlight keys at `currentTime` while rendering the waveform in the transport scrubber.

We are **not** labeling chords. We only surface active MIDI pitches at a moment. The waveform is for navigation and visual context only — it is not used for note detection.

---

## Non-goals (MVP)

- Chord symbols, key detection, or harmony inference
- Real-time analysis in the browser
- Server-side processing or upload pipelines
- Automatic YouTube audio download inside the web app
- Perfect transcription (practice aid, not publishing)
- Polyphonic transcription on full mixed tracks (solo / clean piano only)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Developer machine (one-time per video or cue range)      │
│                                                             │
│  audio file (.wav / .mp3)                                   │
│       │                                                     │
│       ▼                                                     │
│  tools/analyze  (CLI)                                       │
│       ├─ Basic Pitch → note events                          │
│       └─ peak buckets → waveform peaks                      │
│       ▼                                                     │
│  {videoId}.notes.json                                       │
└─────────────────────────────────────────────────────────────┘
        │
        │  copy to public/analysis/  OR  load via file picker
        ▼
┌─────────────────────────────────────────────────────────────┐
│  Cuedeck UI (Next.js, client-only)                          │
│                                                             │
│  YouTube playhead (currentTime)                             │
│       │                                                     │
│       ▼                                                     │
│  query notes where start ≤ t < end                          │
│       │                                                     │
│       ├─► PianoKeyboard highlights active MIDI pitches      │
│       └─► Transport waveform + playhead at currentTime      │
└─────────────────────────────────────────────────────────────┘
```

No backend. The CLI is the only processor in MVP. Server code comes later if viability checks out.

---

## CLI: `tools/analyze`

### Location

```
cuedeck/
  tools/
    analyze/
      README.md           # setup + usage
      pyproject.toml      # or requirements.txt
      analyze.py          # entrypoint
  public/
    analysis/             # gitignored; dev drop zone for JSON
      .gitkeep
  data/
    samples/              # optional: test audio + golden JSON (gitignored large files)
```

### Dependencies

| Tool | Role |
|------|------|
| **Python 3.10+** | Runtime |
| **basic-pitch** | Spotify polyphonic transcription → note events |
| **numpy** (+ **librosa** or **soundfile**) | Load audio samples and compute peak buckets for waveform |
| **ffmpeg** | Optional: extract/normalize audio if CLI accepts video URL or non-wav input |

`basic-pitch` is the default engine for MVP. Alternatives (librosa peak-picking, etc.) are out of scope unless Basic Pitch fails on test material.

### Invocation

```bash
# From repo root
python tools/analyze/analyze.py \
  --input path/to/audio.wav \
  --video-id dQw4w9WgXcQ \
  --output public/analysis/dQw4w9WgXcQ.notes.json

# Optional: analyze only a time range (seconds), e.g. a practice cue
python tools/analyze/analyze.py \
  --input path/to/audio.wav \
  --video-id dQw4w9WgXcQ \
  --start 45.0 \
  --end 72.5 \
  --output public/analysis/dQw4w9WgXcQ.notes.json
```

### CLI behavior

1. Validate input file exists and is readable.
2. If `--start` / `--end` given, ffmpeg-trim before analysis (times in seconds, relative to full audio).
3. Load the (possibly trimmed) audio as mono float samples at a fixed sample rate (44.1 kHz preferred; resample if needed).
4. Run Basic Pitch on the same audio for note events.
5. Compute waveform peak buckets (see **Waveform generation** below).
6. Map note + waveform output to the JSON schema below.
7. Write JSON; print summary to stderr (note count, duration, pitch range, peak count).
8. Exit non-zero on failure with a clear message.

### Waveform generation

The CLI derives a compact peak envelope from the same audio used for note analysis. This avoids a second pass over source material and keeps note timing and waveform timing aligned.

**Algorithm (MVP):**

1. Mix to mono if stereo.
2. Divide the audio into fixed-width time buckets (default **100 peaks per second**).
3. For each bucket, take the max absolute sample amplitude.
4. Normalize all peaks to `0–1` by dividing by the global max (floor at `1e-6` to avoid divide-by-zero on silence).
5. Round to 3 decimal places before writing JSON (keeps file size down without visible loss).

**Defaults:**

| Parameter | Default | Notes |
|-----------|---------|-------|
| `peaksPerSecond` | `100` | ~6k peaks for a 1-minute clip; ~60k for 10 minutes |
| Bucket metric | max abs amplitude | Simple and sufficient for piano scrubber display |

**Not in MVP:** separate frequency bands, RMS vs peak toggle, or stereo lanes. One mono peak lane only.

If `--start` / `--end` trim the audio, waveform buckets cover the trimmed range only (same as `notes` timestamps).

### Getting audio for testing (manual, MVP)

The CLI does **not** download from YouTube in MVP. Developer workflow:

1. Obtain audio out-of-band (yt-dlp, existing recording, DAW export).
2. Prefer **mono or stereo WAV**, 44.1 kHz, clean solo piano.
3. Ensure audio timeline matches the YouTube video (same start point). If the file is a clip, set `--start`/`--end` or embed `offsetSeconds` in JSON (see schema).

Document this in `tools/analyze/README.md`.

### npm script (convenience)

```json
"analyze": "python tools/analyze/analyze.py"
```

---

## Processed file format

**Filename convention:** `{videoId}.notes.json`  
**Schema version:** `1`

```json
{
  "schemaVersion": 1,
  "videoId": "dQw4w9WgXcQ",
  "source": {
    "audioFile": "piano-take.wav",
    "analyzedAt": "2026-06-21T12:00:00Z",
    "tool": "basic-pitch",
    "toolVersion": "0.4.0"
  },
  "timing": {
    "offsetSeconds": 0,
    "durationSeconds": 212.4
  },
  "range": {
    "start": null,
    "end": null
  },
  "waveform": {
    "peaksPerSecond": 100,
    "samples": [0.012, 0.045, 0.128, 0.311, 0.892, 0.654]
  },
  "notes": [
    {
      "pitch": 60,
      "start": 12.42,
      "end": 13.08,
      "velocity": 0.82
    },
    {
      "pitch": 64,
      "start": 12.44,
      "end": 13.05,
      "velocity": 0.71
    }
  ]
}
```

### Field definitions

| Field | Type | Description |
|-------|------|-------------|
| `schemaVersion` | `number` | Increment on breaking changes |
| `videoId` | `string` | YouTube video ID; must match library entry |
| `source` | `object` | Provenance for debugging |
| `timing.offsetSeconds` | `number` | Add to playhead when querying (if audio starts later than video t=0) |
| `timing.durationSeconds` | `number` | Analyzed audio length |
| `range.start` / `range.end` | `number \| null` | If analysis was cue-scoped, original bounds in **video** time |
| `waveform.peaksPerSecond` | `number` | Bucket rate used when generating `samples` |
| `waveform.samples` | `number[]` | Normalized peak amplitudes (`0–1`), one per bucket, in time order |
| `notes[].pitch` | `number` | MIDI note number (21–108 = A0–C8) |
| `notes[].start` | `number` | Seconds, inclusive |
| `notes[].end` | `number` | Seconds, exclusive |
| `notes[].velocity` | `number` | 0–1 normalized; optional for MVP display |

### Query: active notes at time `t`

```ts
function activeNotesAt(notes: Note[], t: number, offsetSeconds = 0): number[] {
  const queryTime = t - offsetSeconds;
  const active = notes.filter((n) => n.start <= queryTime && queryTime < n.end);
  return [...new Set(active.map((n) => n.pitch))].sort((a, b) => a - b);
}
```

### Waveform helpers

```ts
function peakIndexAt(t: number, peaksPerSecond: number): number {
  return Math.max(0, Math.floor(t * peaksPerSecond));
}

function sampleAtTime(
  waveform: WaveformData,
  t: number,
  durationSeconds: number
): number {
  const idx = peakIndexAt(t, waveform.peaksPerSecond);
  const maxIdx = waveform.samples.length - 1;
  if (maxIdx < 0 || durationSeconds <= 0) return 0;
  const clamped = Math.min(idx, maxIdx);
  return waveform.samples[clamped] ?? 0;
}
```

Peak count should match `Math.ceil(timing.durationSeconds * waveform.peaksPerSecond)` within ±1 bucket (rounding at file edges). UI should tolerate off-by-one at the end of the timeline.

### Optional optimization (post-MVP)

Pre-bucket notes into 50 ms frames for O(1) lookup on seek. Not required for MVP if note count is modest (< ~5000 per video).

Store waveform in a separate `{videoId}.waveform.json` if combined files exceed ~500 KB; MVP keeps both in one file for simpler loading.

---

## UI integration (Cuedeck)

### Loading analysis data

Two paths for MVP testing (both client-side):

| Method | Use case |
|--------|----------|
| **A. Static fetch** | Drop `{videoId}.notes.json` in `public/analysis/`. UI fetches `/analysis/{videoId}.notes.json` on player open. 404 → piano and waveform hidden. |
| **B. File picker** | Dev/debug: “Load analysis…” button in player loads a local JSON via `<input type="file">`. Stored in memory for session; optional `sessionStorage` cache. |

Method A is the primary happy path. Method B avoids redeploy when iterating on CLI output.

### Player view layout

Add a **waveform scrubber** in the transport and a **PianoKeyboard** below it (or beside the video on wide screens):

```
┌──────────────┬─────────────────────────────┐
│  Cue sidebar │  Video                      │
│              │  Transport                  │
│              │   ├─ waveform + playhead      │
│              │   └─ play / speed controls    │
│              │  PianoKeyboard (if note data) │
│              │  Capture bar (when open)    │
└──────────────┴─────────────────────────────┘
```

When analysis JSON includes `waveform`, replace the plain `<input type="range">` track with a waveform-backed scrubber. When waveform is absent, fall back to the current range slider (notes-only files still work).

### PianoKeyboard component

- **Input:** `activePitches: number[]` (MIDI)
- **Range:** A0 (21) – C8 (108), or configurable `minPitch` / `maxPitch` from data
- **Display:** 88-key or compact 61-key layout; highlighted keys = active pitches
- **No labels required** beyond optional note names on hover
- **Empty state:** If no analysis file, show nothing (or collapsed “No note data” in dev mode)

### WaveformScrubber component

- **Input:** `samples: number[]`, `peaksPerSecond: number`, `duration: number`, `currentTime: number`, `bookmarks: Bookmark[]`, seek callbacks (same contract as current `Transport` scrubber)
- **Render:** Canvas or inline SVG bars; height ~32–40 px; unplayed peaks in muted color, played portion in accent (or overlay a playhead line only — pick one in implementation)
- **Interaction:** Click or drag anywhere on the waveform to seek; preserve existing bookmark tick marks above the lane
- **Playhead:** Vertical marker at `(currentTime / duration) * width`; updates on the same 200 ms poll as note highlights
- **Performance:** Draw once per resize + when `samples` load; on playhead tick, update marker position only (avoid full redraw every 200 ms if using canvas)
- **Empty state:** No waveform in JSON → hide component and use existing range input

### Sync with playhead

- Reuse existing `currentTime` from `PlayerView` (200 ms poll is fine).
- On each tick: `activeNotesAt(notes, currentTime, offsetSeconds)` → pass to `PianoKeyboard`.
- On seek/scrub (waveform or fallback slider): same note query; no debounce needed for MVP.
- Waveform playhead uses video `currentTime` directly (not `currentTime - offsetSeconds`) so it stays aligned with the YouTube transport; notes still use `offsetSeconds`.

### Types

Add to `src/lib/types.ts`:

```ts
export interface NoteEvent {
  pitch: number;
  start: number;
  end: number;
  velocity?: number;
}

export interface WaveformData {
  peaksPerSecond: number;
  samples: number[];
}

export interface NoteAnalysis {
  schemaVersion: number;
  videoId: string;
  source: Record<string, string | number>;
  timing: { offsetSeconds: number; durationSeconds: number };
  range: { start: number | null; end: number | null };
  waveform?: WaveformData;
  notes: NoteEvent[];
}
```

Add `src/lib/noteAnalysis.ts` with `loadAnalysis`, `activeNotesAt`, `peakIndexAt`, and schema validation (minimal: required fields + `schemaVersion === 1`; `waveform` optional but validated when present).

---

## Success criteria (viability test)

MVP is successful if, on **2–3 clean solo piano YouTube practice videos**:

1. CLI produces JSON in < 2 minutes for a 5-minute clip on a laptop (notes + waveform).
2. UI loads JSON and highlights keys in rough sync with the video (±100 ms feels acceptable).
3. Waveform scrubber renders for the full analyzed duration; playhead tracks playback and scrubbing.
4. Block chords show the expected key cluster most of the time.
5. Fast passages show notes appearing/disappearing plausibly (even if some misses).
6. Team can iterate CLI → drop file → refresh UI without server work.

Document failures (pedal bleed, missed quiet notes, octave errors) in a short test log under `docs/note-visualization-tests.md` when running the MVP.

---

## Implementation phases

### Phase 1 — CLI + schema (no UI)

- [ ] `tools/analyze/` with Basic Pitch pipeline
- [ ] Waveform peak extraction (mono, 100 peaks/sec default)
- [ ] JSON writer matching schema above (notes + waveform)
- [ ] README: install, ffmpeg, manual audio prep
- [ ] One golden sample JSON committed (synthetic or tiny clip) for UI dev

### Phase 2 — UI consumption

- [ ] `NoteAnalysis` + `WaveformData` types + loader
- [ ] Fetch from `/analysis/{videoId}.notes.json`
- [ ] `WaveformScrubber` in `Transport` (fallback to range input when no waveform)
- [ ] `PianoKeyboard` component
- [ ] Wire playhead + notes to `PlayerView`

### Phase 3 — Dev ergonomics

- [ ] File picker fallback in player (dev only or behind flag)
- [ ] `public/analysis/` gitignored except `.gitkeep`
- [ ] npm script `analyze`

### Phase 4 — Evaluate (gate for server work)

- [ ] Test on real practice material
- [ ] Write `docs/note-visualization-tests.md` with go/no-go
- [ ] If go: spec server pipeline (download, queue, storage) separately

---

## Future (explicitly out of MVP)

- Server endpoint: POST video URL → job → stored analysis
- Per-cue analysis jobs triggered from UI
- In-browser WASM transcription
- Confidence scores per note (dim/low-velocity keys)
- Rolling average / debounce to reduce flicker on noisy detections
- Waveform zoom on loop regions; stereo or band-split lanes

---

## Open questions

1. **Default piano range:** Full 88 keys vs scrollable viewport centered on detected range?
2. **Flicker:** Show raw active notes vs minimum 80 ms sustain in UI?
3. **Cue-scoped files:** Separate JSON per cue (`{videoId}_{cueId}.notes.json`) vs one file with `range` metadata?
4. **Waveform density:** Is 100 peaks/sec enough on wide screens, or should the CLI target ~2000 peaks total (scale with duration)?

Recommend starting with one file per video, full 88-key keyboard, and 100 peaks/sec waveform; revisit after viability testing.
