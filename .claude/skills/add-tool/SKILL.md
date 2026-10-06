---
name: add-tool
description: Add a new browser tool to the Tools page of vienjunaid.com, or extend an existing one (PDF Converter, Video Converter, Color Converter, QR Code Generator, Image Format Converter) with a new mode or format. Use whenever asked to build/add/create a tool for the Tools page. Covers the HTML/CSS/JS pattern to copy, how to vendor a library, the known pitfalls already hit, and how to actually verify a tool works (not just that it loads).
---

# Adding a tool to the Tools page

The Tools page (`#tools` in `index.html`) is a **browser of tools**, not a wall of cards: a grid of
tiles (`js/tools.js`), and tapping one swaps in that tool's own view. Every existing tool
(`js/tools-pdf.js`, `js/tools-video.js`, `js/tools-color.js`, `js/tools-qr.js`,
`js/tools-image.js`) follows the same shape. Read one of those before starting — they're the
reference implementation, more trustworthy than this doc if the two disagree.

## 0. Scope check before writing anything

This is a **static GitHub Pages site. No backend, no server, no secrets store, ever.** Everything
must run entirely in the visitor's browser.

- If the tool needs a server, an API key, or to bypass a site's own access/delivery controls (a
  YouTube/Spotify/Instagram downloader is the precedent) — **don't build it**. Say so and ask the
  owner, the same way a YouTube-to-MP3 request was declined in this project's history. This isn't a
  hosting limitation to route around; it's a hard no regardless of where it'd be hosted.
- Otherwise: can it be done with the browser's own APIs (canvas, Web Audio, etc.), or does it need a
  library? Prefer zero dependencies when the browser already does the job — e.g. `tools-color.js`
  parses any CSS color with zero libraries, by setting an element's `style.color` and reading the
  computed, normalized `rgb()` back out.

## 1. HTML: the tile + the view

In `index.html`, inside `#tools-browse .tool-grid`, add a tile:

```html
<button type="button" class="tool-tile" data-tool="<key>">
  <span class="icon">◆</span>
  <span class="name">Your Tool Name</span>
  <span class="blurb">One line describing what it does</span>
</button>
```

Then, as a sibling of the other `.tool-view` blocks (still inside `#tools section`, after the last
one), add the view — hidden until picked, `js/tools.js` handles showing/hiding it automatically
because it matches tiles to views purely by `data-tool="<key>"` ↔ `id="tool-view-<key>"`:

```html
<div class="column tool-view" id="tool-view-<key>" hidden>
  <button type="button" class="tool-back">◀ All tools</button>

  <article class="panel card tool" id="tool-<key>">
    <header><span class="icon">◆</span>Your Tool Name</header>
    <h3>Your Tool Name</h3>
    <p>What it does, in one or two sentences. Say it runs entirely in the browser and nothing is
    uploaded — that's true for every tool here and visitors should know it.</p>

    <!-- mode/format buttons, a file drop zone, a text field — see "Reusable pieces" below -->

    <p class="tool-status" id="tool-<key>-status" role="status" aria-live="polite"></p>
  </article>
</div>
```

You do **not** need to touch `js/tools.js` — it already wires up every `.tool-tile` and
`.tool-view`/`.tool-back` it finds generically.

## 2. Reusable CSS — don't invent new classes unless the UI shape is genuinely new

All of this already exists in `css/site.css` and is themed/responsive/tested:

| Class | What it's for |
|---|---|
| `.tool-modes` / `.tool-mode` (+ `aria-pressed`) | A row of toggle buttons (conversion mode, target format) |
| `.tool-drop` (wraps a hidden `<input type=file>`) | Drag-and-drop + click file picker |
| `.tool-filelist` (a `<ul>`, rows get `.name` / `.size` / a `✕` button) | Selected-files list with remove |
| `.tool-actions` → `.tool-clear` and `.primary` (Convert/Generate/etc.) | Action buttons, auto-disabled when nothing to act on |
| `.tool-status` (+ `.busy`, `.error`) | Progress/result/error line, `aria-live="polite"` |
| `.tool-text` / `.tool-textarea` | A plain text field or textarea (added for Color/QR) |
| `.color-input-row`, `.color-results` | Color Converter's picker+field row and labeled output rows |
| `.qr-preview` | A fixed white box for a canvas that must stay legible regardless of theme |

**Gotcha already hit:** `.column` sets `display: grid`, which — because it's an author rule — beats
the browser's default `[hidden] { display: none }`. Any *new* wrapper class you give the `hidden`
attribute needs its own override, e.g.:
```css
.your-new-wrapper[hidden] { display: none; }
```
(`.tools-browse[hidden], .tool-view[hidden]` already has this. `.verse-stack[hidden]` is the older
precedent for the same bug, elsewhere on the site.)

## 3. JS module: the shape every tool follows

One file, `js/tools-<key>.js`, exporting `init<Key>Tool(root)`. `root` is the `<article>`; the
function does nothing if `root` is null (so it's safe to call unconditionally). Inside:

```js
export function init<Key>Tool(root) {
  if (!root) return
  // query elements by id/class inside root
  // wire up: mode buttons, file input + drag/drop (or a text field), Clear, the primary action
  // a setStatus(text, kind) helper toggling .busy / .error on .tool-status
  // the action handler: disable controls, run the conversion, download() the result, re-enable
}
```

Look at `js/tools-pdf.js` for the fullest version of this (multi-mode, file list, lazy-loaded
libraries) and `js/tools-color.js` for the simplest (no files, no library, just live text input).

**Download helper** (same in every tool — copy it verbatim):
```js
function download(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
```

**Gotcha already hit — output name collisions.** If a tool can zip multiple outputs and two source
files share a basename (`photo.png` + `photo.jpg` both converting to `.png`), naming both outputs
`photo.png` means the second **silently overwrites the first** when added to the zip — real data
loss, found via testing, not reasoning. Every tool that zips multiple outputs carries this exact
helper (duplicated per-module on purpose — these modules don't share a utils file):
```js
function uniqueName(used, name) {
  if (!used.has(name)) { used.add(name); return name }
  const dot = name.lastIndexOf('.')
  const stem = dot === -1 ? name : name.slice(0, dot)
  const ext = dot === -1 ? '' : name.slice(dot)
  let n = 2
  while (used.has(`${stem} (${n})${ext}`)) n++
  const unique = `${stem} (${n})${ext}`
  used.add(unique)
  return unique
}
```
Use it on every name right before `zip.file(name, bytes)` or pushing to an `outputs` array, with a
fresh `const usedNames = new Set()` per conversion run.

Wire the module into `js/app.js`: import it near the other `tools-*` imports, and call
`init<Key>Tool($('#tool-<key>'))` next to the other `init...Tool(...)` calls in `boot()`. That's
the only change needed outside the new file(s).

## 4. Vendoring a library (only if the browser genuinely can't do it alone)

1. Find the latest version and check if it ships a browser build:
   `https://data.jsdelivr.com/v1/packages/npm/<pkg>@<version>` lists every file — look for
   `dist/*.esm.min.js` or `dist/*.min.js` (preferred: a proper ES module, same pattern as
   `js/vendor/adhan.esm.min.js` and `js/vendor/pdf-lib.esm.min.js`).
2. **No browser build at all** (e.g. `qrcode`, which only ships CJS `lib/` source)? Fetch
   `https://cdn.jsdelivr.net/npm/<pkg>@<version>/+esm` — jsdelivr auto-bundles one on the fly.
   Check the result for bare imports of the package's own dependencies (jsdelivr points those at
   itself too, e.g. `import*as ee from"/npm/dijkstrajs@1.0.3/+esm"`) — vendor each one the same way
   and rewrite the import path to the local sibling file (`sed` works fine), or the "vendored" tool
   silently depends on jsdelivr being reachable at runtime, defeating the point.
3. **No ES module at all**, only a UMD global (e.g. `jszip.min.js`)? Load it as a classic `<script>`
   injected at runtime and read the global it sets, rather than a static `<script>` tag in
   `index.html` — keeps it lazy. Copy `importJSZip` from `tools-pdf.js` verbatim; every tool that
   needs zipping uses this exact pattern.
4. Fetch the actual bytes straight into `js/vendor/` (`curl -sL <url> -o js/vendor/...`), plus the
   package's license as `js/vendor/<name>.LICENSE` (check `package.json`'s `license` field; most
   things here are MIT, but `@ffmpeg/core` is GPL-2.0 — redistributing the unmodified compiled
   binary is fine, just keep the license file). These libraries are **not** part of the dashboard,
   so `tools/sync-dashboard.mjs` never touches them — they're vendored by hand, once.
5. **Load lazily, not at module top-level.** `import()` the library dynamically inside the function
   that actually needs it (on first real click, not on page load, not even on Tools-page visit), and
   cache the promise (`let libPromise; const load = () => (libPromise ??= import(...))`) so repeat
   conversions don't refetch. This is why visiting the Tools page costs nothing even though
   `js/vendor/ffmpeg/` alone is ~31 MB.

## 5. Verify it actually works — don't stop at "it loads with no console errors"

Every bug caught in this project's tools (a WASM codec that crashes mid-encode, a zip silently
dropping a file, a CSS rule silently no-opping `hidden`) was found by **running the real
conversion and checking the output bytes**, not by reading the code. Use the `test-in-browser`
skill for the harness (puppeteer-core + headless Chromium + real file uploads + CDP download
capture), and validate outputs with the tool for that format, not a screenshot:

- PDFs: `pdfinfo`, `pdftotext`, `qpdf --show-npages`
- Images: `identify` / `python3 -c "from PIL import Image; ..."` (pixel-level checks, e.g. that
  alpha survived a PNG→PNG round trip, or got correctly flattened to white for PNG→JPEG)
- Video: `ffprobe` (codec, resolution, duration)
- Zips: `zipinfo -1`, `unzip -l`
- Anything meant to be scanned/decoded (QR): decode it back with a second, independent library
  (`jsqr` + `pngjs` in Node) and assert round-trip equality — rendering without errors is not the
  same as being correct.

Test every mode/format the tool offers, not just the first one — `libvpx-vp9` crashed the entire
WASM runtime while `libvpx` (VP8) worked fine with identical surrounding code; only trying both
caught it. Also test the boring paths: wrong file type upload (should be skipped with a message,
not silently accepted or a crash), the empty/no-files state, and — if the tool can produce more than
one output — two inputs that `uniqueName` needs to disambiguate.

## 6. Afterwards

Update `CLAUDE.md`'s `js/` listing (one line) and the Owner preferences / page table only if the
new tool changes something there (it usually doesn't — tools don't get their own scene or page
entry, they live inside the existing Tools page). Don't duplicate this skill's content back into
CLAUDE.md; a one-line pointer is enough.
