# Ocarina Practice — Product Requirements

**Status:** v1 spec, ready to build
**Audience:** implementing AI agent (Claude Code) + the single end user
**Last updated:** 2026-08-12

---

## 1. Overview

A local-only single-page web app for learning the **12-hole alto C ocarina**. Its one job is to answer, instantly and legibly from across a room: *where do my fingers go for this note?*

The app does three things:

1. **Reference** — a fingering chart for all 21 notes the instrument can play.
2. **Scales** — pre-built note runs shown all at once, for warm-ups and dexterity.
3. **Songs** — user-built sequences of notes grouped into *phrases*, shown phrase by phrase for practice.

The user is a software engineer teaching themselves the instrument. This is a personal tool, run on one machine, not a product. Optimize for "useful in an afternoon," not for extensibility.

### 1.1 Explicit non-goals

These are **out of scope for v1**. Do not build them, do not scaffold for them.

| Not building | Why |
|---|---|
| Audio playback / pitch synthesis | User explicitly declined, twice. Visual only. Nothing in this app makes a sound. |
| Microphone input, pitch detection, grading | Out of scope, reaffirmed. Nothing listens. |
| Tempo, meter, bar lines, time signatures, metronome | Note values and rests exist; a rhythmic *structure* does not. The auto-turn timer paces pages, not beats. |
| Accounts, auth, sync, multi-user | Single local user. Sharing is a link carrying the song, not a service. |
| A server, an API, or a database | Browser-only. |
| A practice journal | Phrase status is one enum on a phrase, not a log. |

### 1.2 In scope since v1

These were v1 non-goals and are now built. They are listed here so the reversal
is deliberate and visible rather than implied by the code.

| Now building | Shape |
|---|---|
| Note duration and rests | Optional `dur` and `dotted` on a phrase note; `note: null` is a rest. Library v2, migrated from v1 on read. |
| Staff notation | Hand-drawn SVG treble staff, no bar lines and no meter. A view toggle, never the only view. |
| Other ocarina types | 12-hole alto, soprano and bass C; 6-hole and 4-hole pendants. Instrument geometry and fingerings live together in `app/data/instruments.ts`. The pendant tables are community transcriptions and are marked unverified in the UI. |
| Mobile | Already reversed before this round: the practice and editor screens are built for a phone held sideways as well as a desktop. |

---

## 2. Technical constraints

- **Vue 3** (Composition API, `<script setup>`)
- **TypeScript**, strict mode
- **Tailwind CSS** for all styling
- **Vite** for build/dev
- **`localStorage`** for persistence — no backend, no IndexedDB, no ORM
- **Vue Router** for the handful of views
- State: Pinia if it earns its place; plain composables are acceptable and probably sufficient
- No component library. The fingering diagram is custom SVG and it's the centerpiece — a component kit won't help.

Runs via `npm run dev`. That's the whole deployment story.

### 2.1 Data durability

`localStorage` is one cleared cache away from wiping the song library. Therefore:

- **Export**: a button that downloads the entire library as a single `.json` file.
- **Import**: a file picker that loads such a file, with a "replace" vs "merge" choice.
- Seed data ships as a static TS/JSON module and is loaded on first run (when `localStorage` is empty). Seeding must be idempotent and must never overwrite user edits.

Build these in the first milestone, not the last. Hand-editing an exported JSON file in an editor will frequently be faster than the in-app builder, and that round-trip should work from day one.

---

## 3. Domain model

```ts
/** The 12 holes. `sub*` are the two small sub-holes; `*Thumb` are on the underside. */
type HoleId =
  | 'lhIndex' | 'lhMiddle' | 'lhRing' | 'lhPinky'
  | 'rhIndex' | 'rhMiddle' | 'rhRing' | 'rhPinky'
  | 'lhThumb' | 'rhThumb'
  | 'subA'    | 'subB';

/** Scientific pitch notation. The complete playable set — 21 notes, A4 to F6. */
type NoteId =
  | 'A4'  | 'Bb4' | 'B4'
  | 'C5'  | 'Db5' | 'D5'  | 'Eb5' | 'E5'  | 'F5'
  | 'Gb5' | 'G5'  | 'Ab5' | 'A5'  | 'Bb5' | 'B5'
  | 'C6'  | 'Db6' | 'D6'  | 'Eb6' | 'E6'  | 'F6';

interface Note {
  id: NoteId;
  /** Display label, e.g. "A", "B♭", "D♯". Octave is shown separately/smaller. */
  letter: string;
  octave: 4 | 5 | 6;
  /** Enharmonic alternative for display, e.g. Db5 -> "C♯". */
  altLetter?: string;
  /** Holes that are COVERED. Everything else is open. */
  covered: HoleId[];
  /** Rendered as a caveat under the diagram when present. */
  note?: string;
}

interface Phrase {
  id: string;
  /** Optional user label, e.g. "opening", "the fast bit". */
  label?: string;
  notes: NoteId[];
}

interface Song {
  id: string;
  title: string;
  /** Free text — arrangement source, difficulty, whatever. Single field, not a feature. */
  subtitle?: string;
  phrases: Phrase[];
  createdAt: string;
  updatedAt: string;
}

interface Scale {
  id: string;
  name: string;
  /** Flat list. Scales are not phrased. */
  notes: NoteId[];
}

interface Library {
  version: 1;
  songs: Song[];
  scales: Scale[];
}
```

### 3.1 Design notes on the model

- **Notes are IDs, not objects.** A song stores `['C5','D5','E5']`. Fingerings are looked up from the static table. Never denormalize fingering data into songs.
- **A phrase is the practice unit.** It's the natural chunk the user thinks in — "the first three quick notes of the intro." Phrases have no timing meaning; they are purely grouping.
- **A song is an ordered list of phrases.** A song with one phrase is fine. An empty phrase is fine (it's a rest/breath marker visually, nothing more).
- **Octave lives in the model even though the UI de-emphasizes it.** The user asked for the simplest labelling for now. `A4` and `A5` are different fingerings and must be distinguishable in the model and in the note picker; in the practice display the letter dominates and the octave is a small superscript-style annotation. This can be tuned later without a data migration.

---

## 4. Fingering data (seed)

This is the authoritative table for the **common 12-hole alto C system**. It is factual reference data — hardcode it as a static module (`src/data/fingerings.ts`) and never make it user-editable in v1.

Full range: **A4 – F6, 21 notes, fully chromatic.**

`covered` = holes sealed. All other holes open.

| Note | Covered holes |
|---|---|
| A4 | all 12 |
| B♭4 | all except `subB` |
| B4 | all except `subA` |
| C5 | all 8 finger holes + both thumbs (`subA`/`subB` open) — *home position* |
| C♯5 | C5 minus `rhPinky`, plus `subB` |
| D5 | C5 minus `rhPinky` |
| D♯5 | C5 minus `rhPinky`, `rhRing`, plus `subB` |
| E5 | C5 minus `rhPinky`, `rhRing` |
| F5 | C5 minus `rhPinky`, `rhRing`, `rhMiddle` |
| F♯5 | LH 4 + thumbs + `rhRing` |
| G5 | LH 4 + thumbs (entire right hand lifted) |
| G♯5 | `lhIndex`, `lhMiddle`, `lhPinky` + thumbs + `rhRing` |
| A5 | `lhIndex`, `lhMiddle`, `lhPinky` + thumbs |
| B♭5 | `lhIndex`, `lhPinky` + thumbs + `rhRing` |
| B5 | `lhIndex`, `lhPinky` + thumbs |
| C6 | `lhPinky` + thumbs |
| C♯6 | `lhPinky`, `rhThumb`, `rhRing` |
| D6 | `lhPinky`, `rhThumb` |
| D♯6 | `lhPinky`, `rhRing` |
| E6 | `lhPinky` |
| F6 | none — everything open |

### 4.1 Behavioural facts worth encoding in the UI

- **Sub-holes only matter for the bottom three notes** (A4, B♭4, B4). Everywhere else they're open and irrelevant. Consider dimming them on the diagram outside that range so they stop drawing the eye.
- **The left pinky stays covered through almost the entire range** — it supports the instrument — and only lifts for the top F6.
- **Accidentals are cross-fingerings and vary by maker.** C♯6 and D♯6 in particular: some makers close the LH index instead of the RH ring. Surface a persistent, quiet caveat on the reference screen: *if the chart that came with your ocarina disagrees, use that one.* Attach per-note `note` strings for C♯6 and D♯6.
- More holes covered = lower pitch. Pitch is a function of total open area, not which specific holes.

---

## 5. Screens

Four routes. That's all.

### 5.1 Library (`/`) — the home screen

Opens here every time.

- A list of songs, most-recently-updated first.
- Each row: title, subtitle, phrase count, note count. Click → practice view.
- Row actions: edit, duplicate, delete (with confirm).
- Prominent **New song** button.
- Secondary nav to Scales and Reference.
- Import / export controls live here, quietly (footer or a small toolbar).
- Empty state is an invitation, not an apology: a single "Create your first song" action alongside a pointer to the reference chart.

### 5.2 Practice (`/song/:id`) — the reason the app exists

This is the screen the user stares at while holding an instrument. It must be readable from a metre or two away.

**Layout:** phrases are stacked vertically. Within a phrase, notes flow left to right as a row of fingering cards.

**Density control — the key interaction.** A control (segmented buttons or a slider) sets **how many phrases are visible at once**: 1, 2, 4, 8, or All. Fewer phrases = larger cards. This is a pure CSS-scale/grid problem; the card component should size from a CSS custom property so one control drives everything.

- With a subset shown, provide next/previous phrase-page navigation, keyboard-driven (`←` / `→` or `j` / `k`).
- Phrase label (if set) sits above its row, small and unobtrusive.
- Current phrase-page is visually distinguished; there is no "current note" cursor concept — the user's eyes track, not the app.
- Persist the density choice per-song in `localStorage`.

**The fingering card** — one per note:
- The ocarina diagram (see §6.2), large.
- The note letter, large, below or above the diagram.
- The octave, small and de-emphasized, adjacent to the letter.
- Nothing else. No index numbers, no durations, no controls.

**Also on this screen:**
- Song title, edit button, back to library.
- A fullscreen / distraction-free toggle that hides all chrome. Practicing is the use case; navigation is not.

### 5.3 Scales (`/scales` and `/scales/:id`)

Same fingering cards, but **all notes shown at once** in a single flowing grid — no phrases, no density control, no pagination. The user asked for the whole run visible.

Seed with these, all verified playable within A4–F6:

| Scale | Notes |
|---|---|
| Chromatic (full range) | A4 → F6, all 21 |
| C major | C5 D5 E5 F5 G5 A5 B5 C6 |
| C major (extended) | C5 D5 E5 F5 G5 A5 B5 C6 D6 E6 F6 |
| F major | F5 G5 A5 B♭5 C6 D6 E6 F6 |
| D minor (natural) | D5 E5 F5 G5 A5 B♭5 C6 D6 |
| A minor (natural) | A4 B4 C5 D5 E5 F5 G5 A5 |

> Note for the implementing agent: G major and D major cannot be played as a complete octave on this instrument — the required top notes fall above F6. Do not seed them.

Scales are read-only in v1. User-created scales are a post-v1 nicety; if it's trivial to allow, allow it, but don't build UI for it.

### 5.4 Reference (`/reference`)

The complete 21-note chart, every note and its fingering, in one scrollable grid. Ordered low to high.

The user considers this alone to be worth the app, so it must be excellent:
- Grid of fingering cards, sized to fit a comfortable number per row.
- A filter toggle: **all notes** / **naturals only**.
- The maker-variation caveat, stated once and clearly, near the accidentals.
- Should look good printed. A print stylesheet is a cheap win.

### 5.5 Song editor (`/song/:id/edit`, `/song/new`)

Builds and modifies songs. Three regions:

**A. Song metadata** — title, subtitle.

**B. Phrase list** — the song under construction.
- Phrases render as rows of small fingering cards (or just note letters when space is tight).
- Per phrase: rename, delete, reorder (up/down buttons are sufficient; drag-and-drop only if it's cheap).
- **Add phrase** button appends an empty phrase and focuses it.
- Within a phrase: click a note to remove it; backspace removes the last note of the focused phrase.

**C. Note picker** — the input device.
- A grid or keyboard-like strip of all 21 notes, low to high, each showing its letter and a small fingering glyph.
- Clicking a note **appends it to the currently focused phrase**.
- Focused phrase is unmistakably highlighted. This is the single most important state in the editor — if the user can't tell which phrase they're filling, the whole flow breaks.
- Optional accelerator: keyboard entry where letter keys pick pitch class and a modifier shifts octave. Nice, not required.

The workflow to optimize for: *pick a phrase slot, tap out three or four notes, hit "add phrase", tap out the next few.* Adding a phrase must never require leaving the picker or scrolling away from it.

Autosave to `localStorage` on change, debounced. No save button, no unsaved-changes trap.

---

## 6. Visual design

### 6.1 Direction

Zelda-themed, drawn from **the instrument itself** rather than from game UI: the Ocarina of Time is blue-glazed ceramic with a gold mouthpiece. That's the palette — cool blue glaze, gold, and forest dark — not a generic dark-mode-with-an-accent.

Ship no game assets, logos, or trademarked marks. Colour, shape, and typography only.

**Palette** (define as CSS custom properties, consume through Tailwind theme extension):

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#0F1518` | App background; near-black with a blue-green cast |
| `--stone` | `#1B272B` | Cards, panels, raised surfaces |
| `--glaze` | `#3E7CA6` | Primary interactive; the ocarina's blue glaze |
| `--gold` | `#C9A227` | **Covered holes**, active/selected state |
| `--kokiri` | `#5E9E63` | Secondary accent, confirmations |
| `--parchment` | `#E6E0CE` | Primary text |
| `--parchment-dim` | `#9AA39B` | Secondary text, octave labels, disabled |

Covered holes in gold against the dark diagram is the app's single loudest move. Everything else stays quiet and disciplined — no gradients, no glows, no decorative flourishes competing with the diagrams.

**Typography** — three roles:
- **Display** (song titles, screen headings): *Fraunces* — a variable serif with genuine character, used with restraint.
- **Body / UI**: *Karla* — humanist, plain, gets out of the way.
- **Note labels**: *Space Grotesk*, heavy weight, large. These are the biggest type on screen and need to read as signage, not as body copy.

Load from Google Fonts or self-host. Set a deliberate type scale; note letters should be genuinely large (think 2.5–4rem at the lowest density setting).

Corners: small radii (2–4px) throughout. Ceramic, not bubblegum.

### 6.2 The fingering diagram — the signature element

A custom SVG component. Get this right and the app is good; get it wrong and nothing else saves it.

```
Props: covered: HoleId[], size?: 'sm' | 'md' | 'lg' | number, dimSubholes?: boolean
```

Requirements:
- The **transverse ("sweet potato") ocarina silhouette** — not a rounded rectangle, not a circle. A recognisable body outline with the mouthpiece/windway at one side gives the diagram its identity and orients the player.
- **Eight finger holes on the front face**, positioned in the standard 4-left / 4-right arrangement.
- **Two thumb holes** rendered as an inset or offset group with a **dashed outline**, labelled as the underside. They must be visually distinct from front holes or the diagram lies.
- **Two sub-holes** as noticeably smaller circles adjacent to their paired main holes.
- **Covered = filled `--gold`. Open = unfilled with a `--parchment-dim` stroke.** High contrast, no ambiguity, legible when scaled down to picker-glyph size.
- Purely presentational and stateless. Scales cleanly from ~32px (picker glyph) to ~400px (single-phrase practice view) with no layout breakage — use `viewBox`, never fixed pixel geometry.
- A tiny `LH` / `RH` orientation cue somewhere quiet. Optional but useful early on.

### 6.3 Quality floor

Meet without announcing: visible keyboard focus rings, `prefers-reduced-motion` respected, sensible tab order, adequate contrast. Motion should be near-absent — this is a reference tool, and animation between phrase pages would actively hurt.

---

## 7. Seed data

Ships as static modules, loaded on first run only.

1. **`fingerings.ts`** — all 21 notes per §4. Static, non-editable, always present.
2. **`scales.ts`** — the six scales in §5.3.
3. **`songs.ts`** — starter songs.

### 7.1 On seeded songs

The user wants the Ocarina of Time songs pre-loaded. Those melodies are copyrighted compositions, so **this spec does not include their note sequences** — seed the song entries as titled shells with empty phrases and let the user fill them in from the arrangement source of their choice.

This is a smaller loss than it sounds: entering six short melodies is the perfect shakedown of the phrase builder, and it will surface every rough edge in the editor within about ten minutes of use.

Seed titled, empty entries for: *Song of Storms*, *Zelda's Lullaby*, *Epona's Song*, *Saria's Song*, *Sun's Song*, *Song of Time*.

Additionally seed **one fully-populated public-domain song** so the practice view has real content on first launch and the phrase model is self-evident. *Twinkle Twinkle Little Star* or *Amazing Grace* both sit comfortably in range and phrase naturally.

---

## 8. Build order

Ship each milestone as something runnable.

**M1 — Foundations**
Vite + Vue 3 + TS + Tailwind scaffold. Types from §3. `fingerings.ts` complete and correct. The `<FingeringDiagram>` SVG component. A throwaway route rendering all 21 notes to eyeball the diagram at multiple sizes. *Nothing else matters until the diagram looks right.*

**M2 — Reference & scales**
`/reference` and `/scales`. Seed scales. Naturals filter. Print stylesheet. At this point the app is already independently useful.

**M3 — Persistence**
`localStorage` layer, library store, first-run seeding, JSON import/export. Verify: export → clear storage → reimport → identical library.

**M4 — Library & practice**
`/` and `/song/:id`. Density control, phrase pagination, keyboard nav, fullscreen mode. Seeded populated song makes this testable immediately.

**M5 — Editor**
`/song/new`, `/song/:id/edit`. Note picker, phrase management, autosave. Then use it to enter the six OoT melodies — that's the real acceptance test.

**M6 — Polish**
Type scale, spacing, empty states, focus states, delete confirms, the accidentals caveat copy.

---

## 9. Acceptance criteria

- [ ] All 21 notes A4–F6 render with fingerings matching §4 exactly.
- [ ] The diagram distinguishes front holes, underside thumb holes, and sub-holes at a glance.
- [ ] A song can be created, given phrases, filled with notes via the picker, and saved — without a page reload or a save button.
- [ ] The practice view's density control changes both how many phrases show and how large the cards are.
- [ ] Note letters are legible from ~2m on a desktop monitor at the lowest density setting.
- [ ] Closing the browser and reopening restores the full library.
- [ ] Export produces a JSON file that import restores exactly.
- [ ] Scales render every note at once with no pagination.
- [ ] Maker-variation caveat appears on the reference screen.
- [ ] `npm run dev` is the only setup step. No env vars, no services, no build config to touch.

---

## 10. Post-v1 parking lot

Do not build. Recorded so they're not re-litigated.

- Audio playback of note pitches
- Per-song and per-phrase practice notes
- Progress / practice-session tracking
- Alternate ocarina types
- Tempo, rhythm, or duration
- Alternate fingering sets per note (maker variations as data)
- User-created scales
- Backend and a real database

---

## Appendix A — Reference sources

Fingering data derived from published 12-hole alto C charts; range and sub-hole behaviour corroborated across multiple ocarina references. The instrument's own supplied chart takes precedence for accidentals.
