# Architecture

This document covers how the site is put together, what it borrows from the RPi Dashboard, and why
each choice was made.

## Overview

```
┌──────────────────────── rpi-dashboard (source of the look) ───────────────────────┐
│  apps/web/src/renderer, scene, lib   config/scenes, themes   assets/   quran.json │
└───────────────────────────────────────┬───────────────────────────────────────────┘
                                        │  node tools/sync-dashboard.mjs
                                        ▼
┌──────────────────────────── this repo (static files) ─────────────────────────────┐
│  js/engine/   data/scenes.json   data/verses.json   fonts/   js/vendor/adhan      │
│                                                                                   │
│  index.html ──▶ css/site.css                                                      │
│       │                                                                           │
│       └──▶ js/app.js ──┬─▶ js/scene-view.js ──▶ js/engine (renderer + scenes)     │
│                        ├─▶ js/pixel-title.js                                      │
│                        ├─▶ js/prayer-times.js ──▶ js/vendor/adhan                 │
│                        └─▶ js/config.js                                           │
└───────────────────────────────────────┬───────────────────────────────────────────┘
                                        │  git push
                                        ▼
                        GitHub Pages  ──▶  vienjunaid.com
```

The dashboard is a local web app with a server. This site is the same front end with **no server**:
everything the dashboard's server did is either done in the browser (prayer times), done once at sync
time (verses, scene bundles), or left out (Quran player, calendar, system page).

## Technology

| Tool | Role | Why |
|---|---|---|
| **Plain HTML, CSS, ES modules** | The site | GitHub Pages serves files as they are. No build step to break or forget. |
| **The dashboard's engine** (`js/engine/`) | Renderer and scenes | The actual code, not a look-alike, so the two can't drift. |
| **TypeScript** (the dashboard's copy) | Sync time only | `transpileModule` strips types file by file and keeps the comments. |
| **WebGL2**, Canvas 2D fallback | Drawing the scene | One full-screen shader pass; about 0.2 ms of CPU per frame. |
| **adhan** | Prayer times | Offline astronomical calculation, in the browser. |
| **Intl** (`islamic-umalqura`) | Hijri date | Built into the browser. |
| **localStorage** | Visitor settings | There is no server to save them to. |
| **JetBrains Mono, Amiri Quran** | Fonts | The dashboard's fonts, self-hosted (OFL). |

## The sync (`tools/sync-dashboard.mjs`)

One script copies the look across. It writes four things:

1. **`js/engine/`**: 26 TypeScript modules from `apps/web/src` (`renderer/`, `scene/`,
   `scene/backgrounds/`, and `lib/` color, theme, prayerClock, timeFormat, hijri, plus the clock's
   block digits), transpiled to ES2022 modules.
   - Import paths get real file names, since browsers don't guess: `'./grid'` → `'./grid.js'`,
     `'./backgrounds'` → `'./backgrounds/index.js'`.
   - Each file starts with a line saying where it came from.
2. **`data/scenes.json`**: every scene in `config/scenes/`, bundled with its theme, background and
   character assets, so the page makes one request instead of forty.
   - Characters matching `PERSONAL` (`vien-*`, `wife-*`, `bride-*`, `groom-*`) are dropped.
   - `farooq-wedding` without the couple is renamed `farooq-arch`.
3. **`data/verses.json`**: the dashboard's `verse.featured` list, looked up in `quran.json`. The
   basmala is split off ayah 1 for display, the same way the dashboard's server does it (letters
   compared with the marks stripped). The basmala's letters are taken from Al-Fatiha 1:1 in the data
   rather than typed.
4. **`fonts/`** and **`js/vendor/adhan.esm.min.js`**, with their licenses.

The generated folders are committed. Nothing in them is edited by hand.

## Rendering

The pipeline is the dashboard's, unchanged. Every cell of a text grid has a glyph, a foreground color
and a background color. ASCII art uses the glyphs; pixel art uses the half block `▀` with
fg = the top pixel and bg = the bottom pixel. The grid is **60 rows** on every screen, so a phone
shows the same composition as a monitor. See the dashboard's `ARCHITECTURE.md` for the renderer, the
palette, and how each scene is drawn.

`js/scene-view.js` is the port of `AsciiScene.svelte`:

- It builds **every scene up front** with one shared `GlyphSet` and `Palette`, so ids mean the same
  thing in every scene's grid and two scenes can be blended cell by cell.
- **`show(index, dir)`** starts the pixel wipe (900 ms, ease-in-out). While it runs, both scenes
  draw into their own grids and are combined: a cell shows the incoming scene once the sweep front
  has passed `x + jag·hash(x, y)`, with a band of `█▓▒░` in the incoming scene's accent color.
- **Resize** is debounced by 150 ms and skipped when the grid size hasn't changed, because scenes
  rebuild their static layers for a new size.
- **Reduced motion** (`prefers-reduced-motion`): 4 fps and a straight cut instead of the wipe.
- `?debug` adds the stats line.

## Pages

- **The content is HTML.** Each page is a `<section class="page">` in `index.html`. `app.js` gives
  one of them `.active`; the others are `display: none`.
- **Routing is the URL hash.** `config.pages[i].id` is both the section's id and the address. The
  dock's links are plain anchors, and `hashchange` calls `showPage(i, dir)`.
  - `dir` is +1 when moving to a later page and −1 to an earlier one. Arrow keys and swipes set it
    themselves, so the wipe goes the right way across the wrap from the last page to the first.
  - Navigation is debounced for 950 ms, the length of the wipe.
- **`showPage`** fades the old section out (250 ms), fades the new one in after the wipe has started
  (500 ms, delayed 450 ms), restarts the pixel title, and calls `refresh`.
- **`refresh(dir)`** is the one place that brings the canvas and the theme in line with `view`: it
  works out the active scene, calls `sceneView.show`, and applies that scene's theme to the CSS
  variables (`--bg`, `--fg`, `--accent`, `--muted`, `--verse`) and the browser's `theme-color`.

### Which scene a page shows (`sceneFor`)

In order:

1. The scene being previewed in the background picker (`view.preview`).
2. The visitor's saved choice (`prefs.backgrounds[page.id]`).
3. The page's own: `scene`, or for the home page `sceneByPrayer[view.selected ?? period.prayer]`.

On the home page, a prayer tapped in the Salah box wins over a saved background, as on the dashboard.

### State

| Object | Holds | Lives |
|---|---|---|
| `view` | `page`, `selected` prayer, `scenery`, `galleryIndex`, `picking`, `preview`, `settingsOpen` | Memory |
| `prefs` | `hour24`, `verse`, `glass`, `backgrounds` | `localStorage` (`site:prefs`) |
| `period` | The prayer period it really is in Atlanta | Memory, checked every second |

There is no framework. Each widget has a `paint…` function that writes the DOM from this state, and
the code that changes state calls it.

## The home page's widgets

- **Clock:** the dashboard's 3×3 block digits (`bigText`), the date, and the Hijri date from
  `lib/hijri.ts` (Intl Umm al-Qura). It is the button that opens Settings.
- **Salah:** `prayer-times.js` returns the same shape as the dashboard's `/api/prayer/today`
  (`times`, `next`, `current`, `timezone`), so the engine's `prayerClock` works unchanged, including
  the Fajr scene's sunrise (`dawnProgress`).
  - Times are for `config.prayer` (Atlanta, NorthAmerica method, Shafi) and are shown in that
    timezone, whatever the visitor's own.
  - adhan takes the calendar day from the Date's local fields, so the Date is built from Atlanta's
    day, not the visitor's.
  - They are recalculated 30 s after each prayer passes and every 30 minutes.
- **Verse:** a random verse from `data/verses.json`, changed every `verse.rotateMinutes` or on a
  tap. Old and new share one grid cell and crossfade over 1.5 s. With the verse off, the name takes
  its place in the verse's box, as the prayer banner does on the dashboard.
- **Pixel title** (`pixel-title.js`): the port of `PixelTitle.svelte`. The text is rasterized small,
  every opaque pixel becomes a particle that flies in along an arc, and a gold light then sweeps
  across. It is sized by window height and shrunk to fit `maxWidth`. The real `<h1>`/`<h2>` stays in
  the page for screen readers and search engines.

## Overlays

- **Settings** and the **background picker** are built by `openSheet`, which adds a backdrop and a
  box, moves focus in, and puts it back on close. Only one is open at a time.
- The picker previews live: choosing a scene sets `view.preview` and calls `refresh`. Save writes
  `prefs.backgrounds`; Cancel, a click outside or Esc puts the saved scene back.
- **Scenery mode** adds `body.scenery`, which hides the pages and the dock. Left or right taps, swipes
  and arrow keys step `view.galleryIndex` through every scene, in gallery order: the prayer scenes,
  the pages' scenes, then the rest.

## Layout and themes

- **Home, wide screens:** the dashboard's grid, `auto minmax(0, 1fr) auto` columns, so the verse can
  only use the space between the clock and the Salah box.
- **Under 900 px:** one scrolling column, with the verse and name first.
- **Text pages** scroll inside the section, with the canvas fixed behind. Their boxes use a darkened
  `--panel` at 90% so long text stays readable over a bright theme.
- **The dock** is fixed at the bottom middle, in the style of the dashboard's Background box.
- **No backdrop blur by default**, for the same reason as the dashboard: over a canvas that changes
  every frame it is redone every frame. Glass blur is a per-visitor setting (`html.glass`).

## Without JavaScript

An inline script adds `html.js` only if the browser supports modules. The module script's `onerror`
and a `catch` around `boot()` remove it again. Without that class, the end of `css/site.css` shows
every page stacked as one plain document, hides the widgets that need scripts (`.needs-js`), and
shows the real headings in place of the pixel titles. A print stylesheet does the same.

## What is not here

| Dashboard feature | Why it's left out |
|---|---|
| Quran player | Audio, and it needs the server and `mpv` |
| Sleep mode, System page | They are about the Pi |
| Hijri and Google calendar cards | The calendar is private; not built |
| Live reload, importer, Spotify | Server features |
| The couple's characters | Kept off the public site (see `PERSONAL` in the sync script) |
