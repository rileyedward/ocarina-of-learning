# Ocarina Practice

Fingering charts and phrase-by-phrase practice for the 12-hole alto C ocarina.

## Overview

### What is Ocarina Practice?

Ocarina Practice is a local application for learning the ocarina — the 12-hole
alto C by default, with 6-hole and 4-hole pendants and the soprano and bass
alongside it. It shows the fingering for every note an instrument can play,
pre-built scale runs for warm-ups, and songs you have built out of short
phrases, a few phrases at a time, while you hold the instrument. It also
drills you on the chart, and reads the chart backwards when you find a
fingering and want to know what it is.

Everything runs in the browser. Nuxt ships it as a client-only SPA — there is
no backend, no database, and no account.

### Why Use Ocarina Practice?

A printed fingering chart answers "where do my fingers go for this note?" but
not "what do I play next?" — and following a chart while reading a melody means
holding two things at once. This app puts the answer on screen as a row of
large diagrams, one per note, grouped into the phrases you actually practise.
The note letters are big enough to read from across a room, and a single
control decides how much of the song is visible at once, so the same screen
works for learning four notes and for running the whole piece.

### Key Features

- **Complete Fingering Chart**: All 21 notes from A4 to F6, fully chromatic,
  with covered holes filled in gold against the open ones.
- **Five Instruments**: 12-hole alto, soprano and bass C, plus 6-hole and
  4-hole pendants. Geometry and fingerings travel together, so each one draws
  itself. The pendant charts are community transcriptions and say so.
- **Change Hints**: Each card marks the holes that lift and press against the
  note before it — the part that is actually hard to play.
- **Phrase-Based Practice**: Songs are ordered lists of short phrases — the
  chunk you actually rehearse — rather than a wall of notes.
- **Density Control**: Auto, or 1, 2, 4, 8, or all phrases at once. Fewer
  phrases means larger cards; one control drives both.
- **Hands-Free Turning**: A wake lock keeps the screen alive, the outer edges
  turn the page on a tap, and auto-turn advances on a timer.
- **Distraction-Free Mode**: Hide every piece of chrome with one key while you
  play.
- **Note Values and Rests**: Optional. A song that never sets one behaves
  exactly as songs did before they existed.
- **Staff Notation**: The same phrase on a treble staff, hand-drawn in SVG.
  No bar lines and no time signature — the model has no meter and the screen
  must not imply one.
- **Phrase Status**: Mark a phrase new, shaky or learned, and hide the learned
  ones once they stop needing the screen.
- **Scale Runs**: Six seeded scales, editable, plus your own — up, down, up and
  down, or shuffled.
- **Drill**: Flashcards from any scale, song, or the whole chart. Nothing is
  scored and nothing is kept.
- **Reverse Lookup**: Tap holes on a blank diagram to find out what note they
  make.
- **Song Editor**: Tap notes from a picker, type them as shorthand
  (`c d e/8 r/4 bb4`), or use the keyboard. Drag to reorder phrases and to move
  notes between them. Undo with ⌘Z. Autosaves — there is no save button.
- **Print**: A song prints as the whole run, every phrase, on white paper.
- **Share Links**: A link that carries the entire song in its fragment. No
  server, no account, nothing uploaded.
- **JSON Export and Import**: Download the whole library as one file and load it
  back, with a preview of exactly what a merge would replace.

## Getting Started

### Prerequisites

Ensure you have the following prerequisites installed on your system. You can
verify each installation by running the provided commands in your terminal.

1. **Node** (22.19+ or 24.11+) and **NPM** (Node Package Manager) are needed for the
   application and its dependencies. Check their installations with:

    ```bash
    node --version
    npm --version
    ```

That is the entire list — no database, no environment file, and no backend
service to start.

### Installation

1. Install JavaScript dependencies:

    ```bash
    npm install
    ```

2. Start the application:

    ```bash
    npm run dev
    ```

3. Open it in your browser:

    ```
    http://localhost:3000
    ```

On first run the library seeds itself from `data/ocarina-library.json` — an
export of the songs already entered, notes and all, so a fresh browser opens
with the same library. The footer's *Reset to default library* puts an install
back to exactly that file.

## Usage

### Screens

| Route | Screen | What it is for |
|---|---|---|
| `/` | Library | Songs, searchable and sortable, with import and export |
| `/song/:id` | Practice | The screen you stare at while holding the instrument |
| `/song/:id/edit` | Editor | Build and modify a song's phrases |
| `/song/shared` | Shared song | Previews a song that arrived in a link |
| `/scales`, `/scales/:id` | Scales | Warm-up runs, whole run visible at once |
| `/reference` | Reference | Every note in one grid, prints well |
| `/reference/lookup` | Reverse lookup | Tap holes, find the note |
| `/drill` | Drill | Flashcards, self-checked |

### Practice keys

| Key | Action |
|-----|--------|
| `→` / `J` | Next phrase page |
| `←` / `K` | Previous phrase page |
| `Space` | Step the cursor on a note |
| `S` | Practise the visible phrase alone |
| `P` | Start or stop automatic page turns |
| `F` | Toggle distraction-free mode |
| `Esc` | Leave solo, then distraction-free mode, then auto-turn |

In distraction-free mode the outer edges of the notes are page-turn targets, so
a knuckle or an elbow does the job a swipe does. The screen is held awake for
as long as the practice screen is open.

The density control sets how many phrases are visible at once and, with it, how
large the cards are. The choice is remembered per song.

### Building a song

Pick a phrase to make it the focused one — it gets a gold ring and the picker
says *Adding to:* by name. Then:

| Action | How |
|---|---|
| Add a note | Click it in the picker; it appends to the focused phrase |
| Add several | **Type notes**, then `c d e/8 r/4 bb4` — octave carries forward |
| Add from the keyboard | `a`–`g` for notes, `r` for a rest, `#` sharpens the last, `↑` `↓` shift it an octave |
| Edit a note | Click it inside the phrase: note value, dot, make it a rest, split here, remove |
| Remove the last note | `Backspace` |
| Add a phrase | **+ Add phrase** or `Enter`; the new one takes focus |
| Reorder | Drag the ⠿ grip, or the arrows on each phrase row |
| Move a note between phrases | Drag the note chip onto another phrase |
| Repeat a phrase | The `×N` box in its header |
| Undo | `⌘Z` / `Ctrl+Z`, redo with `⇧⌘Z` |

The picker is fixed to the bottom of the screen, so adding a phrase never
scrolls it out of reach. Changes save to `localStorage` on a short debounce.

### Reading the diagram

Covered holes are filled gold; open holes are outlined. The eight front finger
holes sit in two mirrored clusters, left hand and right hand, with a wide gap
down the middle. The two smaller circles beside each pinky are the sub-holes,
dimmed on notes that do not use them. The two thumb holes are on the underside
of the instrument and are drawn in their own dashed panel so the diagram never
implies they are on the front.

## Data

The library lives in `localStorage` under `ocarina.library.v1` — schema version
2, same key — and is seeded on first run from `data/ocarina-library.json`, the
file the Export button writes. Updating what ships is: drop a newer export in
that file and bump `SEED_REV` in `app/composables/useLibrary.ts`. A version 1
payload is read, upcast (bare note strings become `{ note }` objects) and copied
aside to `ocarina.library.v1.backup` before anything writes over it.

Seeding never overwrites edits. An existing library is used as-is, with one
exception: once per `SEED_REV`, seed songs the install has never held are
appended, so an old install picks up new songs while a song deleted after that
stays deleted. `ocarina.seed.rev` records the revision already applied.

Because that is one cleared cache away from gone:

- **Export JSON** (library footer) downloads the entire library as one file.
- **Import JSON** loads such a file, either **merging** by song id (incoming
  wins) or **replacing** the library outright.

Hand-editing an exported file is often faster than the in-app builder, and the
round trip is covered by tests. Unknown notes and malformed entries are dropped
on import rather than thrown on, so a hand-edited file degrades instead of
bricking the app. A stored payload that cannot be read at all is moved aside to
`ocarina.library.corrupt.<timestamp>` rather than discarded.

Per-song density and columns live under `ocarina.density.<songId>` and
`ocarina.cols.<songId>`; app-wide view preferences — notation, ♯/♭ spelling,
default instrument, auto-turn interval — live under `ocarina.prefs.v1`. None of
them are library data. `ocarina.export.meta` remembers when you last exported
and how many edits have happened since, which is all the export nag is.

## Fingering Data

`app/data/fingerings.ts` holds the authoritative table for the common 12-hole
alto C system — 21 notes, A4 to F6, fully chromatic. It is reference data, not
user data, and is never editable in the app.

`app/data/instruments.ts` wraps that table together with the diagram geometry,
and adds the other four instruments. The soprano and bass share the alto's
fingerings exactly and differ only in the octave they sound. **The 6-hole and
4-hole pendant tables are community transcriptions, not checked against a
published chart** — they are marked `verified: false` and the reference screen
says so above the grid. Pendant systems vary by maker and their accidentals are
half-covered holes, which a filled/open diagram cannot draw at all.

Fingerings are composed from named constants (`HOME`, `LH4`, `THUMBS`) rather
than typed out twenty-one times, so the table can be read against a published
chart line by line. `tests/fingerings.test.ts` checks it against a separate
transcription of that chart, so a typo cannot agree with itself.

Accidentals are cross-fingerings and vary by maker. C♯6 and D♯6 in particular —
some makers close the left index instead of the right ring. The reference screen
says so. **If the chart that came with your ocarina disagrees with this one, use
that one.**

## Testing

```bash
npm test        # vitest, mounts every page as a plain Vue component
npm run typecheck
```

Covers the fingering table against a second transcription, the instrument model
and its derived helpers, the v1 → v2 migration, the typed-note parser, the
share-link round trip, the undo stack, the storage layer's seeding, autosave and
export/import, and a mount of every screen — paging, the naturals filter, typed
entry, phrase status, reverse lookup, the drill and a shared link.

## Tech Stack

- **Nuxt 4** (`ssr: false`) + **Vue 3** + **TypeScript** — Composition API with
  `<script setup>`, file-based routes under `app/pages/`
- **Tailwind CSS v4** — styling, palette as `@theme` tokens
- **localStorage** — persistence, no backend
- **Vitest** + **@vue/test-utils** — testing

State is a single module-scope reactive store in
`app/composables/useLibrary.ts`. There is no Pinia; one store with no
cross-store dependencies does not need it.

The fingering diagram is hand-written SVG (`app/components/FingeringDiagram.vue`)
sized entirely from its `viewBox`, so the same component serves as a 52px chip
in the editor, a 60px glyph in the picker, and a 340px practice card. There is no component library — the diagram is
the centerpiece and a component kit would not help draw it.

## Deployment

Built for Laravel Cloud's Nuxt runtime. See [DEPLOY.md](DEPLOY.md) for the
exact runtime, build command, and mode to select.

```bash
npm run build   # .output/server/index.mjs — Nitro node-server
npm start       # serve that build locally
```

## Scope

Deliberately absent: **audio playback and pitch synthesis**, and **microphone
input, pitch detection or grading**. Nothing here makes a sound or listens for
one; the instrument does that.

Also absent: tempo and meter. Notes carry an optional value and there are
rests, but there are no bar lines, no time signature and no metronome — the
auto-turn timer paces pages, not beats. And no accounts, no server, no sync.
