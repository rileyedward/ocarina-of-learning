# Ocarina Practice

Fingering charts and phrase-by-phrase practice for the 12-hole alto C ocarina.

## Overview

### What is Ocarina Practice?

Ocarina Practice is a local application for learning the 12-hole alto C ocarina.
It does three things: shows the fingering for all 21 notes the instrument can
play, shows pre-built scale runs for warm-ups, and shows songs you have built
out of short phrases, a few phrases at a time, while you hold the instrument.

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
- **Phrase-Based Practice**: Songs are ordered lists of short phrases — the
  chunk you actually rehearse — rather than a wall of notes.
- **Density Control**: Show 1, 2, 4, 8, or all phrases at once. Fewer phrases
  means larger cards; one control drives both.
- **Distraction-Free Mode**: Hide every piece of chrome with one key while you
  play.
- **Scale Runs**: Six seeded scales, each shown in full with no pagination.
- **Song Editor**: Build songs by tapping notes from a picker into the focused
  phrase. Autosaves — there is no save button.
- **JSON Export and Import**: Download the whole library as one file and load it
  back, either merging or replacing.

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

On first run the library seeds itself: one fully populated public-domain song
(*Twinkle Twinkle Little Star*) and six titled shells for the Ocarina of Time
melodies, ready for you to enter from whatever arrangement you are working from.

## Usage

### Screens

| Route | Screen | What it is for |
|---|---|---|
| `/` | Library | Songs by most recently edited, with import and export |
| `/song/:id` | Practice | The screen you stare at while holding the instrument |
| `/song/:id/edit` | Editor | Build and modify a song's phrases |
| `/scales`, `/scales/:id` | Scales | Warm-up runs, whole run visible at once |
| `/reference` | Reference | All 21 notes in one grid, prints well |

### Practice keys

| Key | Action |
|-----|--------|
| `→` / `J` | Next phrase page |
| `←` / `K` | Previous phrase page |
| `F` | Toggle distraction-free mode |
| `Esc` | Leave distraction-free mode |

The density control sets how many phrases are visible at once and, with it, how
large the cards are. The choice is remembered per song.

### Building a song

Pick a phrase to make it the focused one — it gets a gold ring and the picker
says *Adding to:* by name. Then:

| Action | How |
|---|---|
| Add a note | Click it in the picker; it appends to the focused phrase |
| Remove a note | Click that note inside the phrase |
| Remove the last note | `Backspace` |
| Add a phrase | **+ Add phrase**; the new one takes focus |
| Reorder or delete | The arrows and `✕` on each phrase row |

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

The library lives in `localStorage` under `ocarina.library.v1` and is seeded on
first run from `app/data/`. Seeding is idempotent — an existing library is used
as-is and never merged into or overwritten.

Because that is one cleared cache away from gone:

- **Export JSON** (library footer) downloads the entire library as one file.
- **Import JSON** loads such a file, either **merging** by song id (incoming
  wins) or **replacing** the library outright.

Hand-editing an exported file is often faster than the in-app builder, and the
round trip is covered by tests. Unknown notes and malformed entries are dropped
on import rather than thrown on, so a hand-edited file degrades instead of
bricking the app. A stored payload that cannot be read at all is moved aside to
`ocarina.library.corrupt.<timestamp>` rather than discarded.

Per-song density lives separately under `ocarina.density.<songId>`; it is a view
preference, not library data.

## Fingering Data

`app/data/fingerings.ts` holds the authoritative table for the common 12-hole
alto C system — 21 notes, A4 to F6, fully chromatic. It is reference data, not
user data, and is never editable in the app.

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

Covers the fingering table, the storage layer's seeding, autosave, and
export/import round trip, and a mount of every screen — the density control's
paging, the naturals filter, and the picker appending into the focused phrase.

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

Alto C 12-hole only. The data model does not anticipate 6-hole, 4-hole, bass, or
soprano instruments.

Deliberately absent: rhythm, note duration, and tempo (notes are an ordered list,
nothing more), audio playback, microphone input or pitch grading, staff notation,
accounts, and any kind of sync. The target is a desktop screen sat next to the
player; it degrades on a phone rather than designing for one.
