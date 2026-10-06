# CLAUDE.md — vienjunaid.com

Read this first when you start a session. It records the project, the owner's preferences, how the
code fits together, and the traps already hit. Keep it current when behavior or conventions change.

## What this is

**Vien Tran's** personal site (`vienjunaid.com`, GitHub Pages, repo `VienJunaid/landingpage`). It is a
portfolio in the look of his **RPi Dashboard** (`/Users/vien/Documents/Work/rpi-dashboard`): a
pixel-art / ASCII scene behind every page, Omarchy-style boxes on top, JetBrains Mono, and a theme
that follows the scene. Personal first, with the professional content (experience, projects, resume)
inside it.

- **Home:** the scene **follows the prayer times** (Atlanta). On top: the clock with the Hijri date,
  a rotating Quran verse, "VIEN TRAN" assembling in pixels, the Salah box, and a small intro card.
  - Tap a prayer in the Salah box to preview its scene (yellow ◀ = live, light blue ◆ = picked).
  - Tap the clock for **Settings**: scenery mode, home background, 24-hour time, verse on/off, glass
    blur.
  - Tap the verse for another verse.
- **About, Experience, Projects, Resume:** boxes of text over one scene each, with a pixel title.
- **Tools:** a browser of working browser tools, over one scene. Tap a tile to open that tool (a box
  like any other, just interactive instead of a static blurb); `◀ All tools` returns to the grid.
  Everything runs client-side — nothing is ever uploaded. See "Adding a tool" below.
- **Dock** (bottom middle, every page): the page links, and **▣ Background** to change that page's
  scene.
- **Scenery mode:** only the art. Tap left or right to browse every scene; a faint ✕ returns.

| Page | Default scene |
|---|---|
| Home | `aqsa-fajr`, `kaaba-dhuhr`, `sophia-asr`, `madinah-maghrib`, `farooq-isha` (by prayer) |
| About | `kazakh-meadow` |
| Experience | `madinah` |
| Projects | `haram-aerial` |
| Resume | `night-mosque` |
| Tools | `farooq-arch` |

Also available in the picker and scenery mode: `aqsa-sunset`.

## Owner preferences (follow these)

- **Claude writes the code for this project.** The user asked for this explicitly. This overrides the
  global "hints only" memory, which applies to the user's coursework.
- **Match the dashboard.** When a style or behavior exists there, copy it rather than inventing one.
  CSS taken from its Svelte components is marked "dashboard" in `css/site.css`.
- **The couple's characters stay off the public site** (`vien-*`, `wife-*`, `bride-*`, `groom-*`).
  The sync script filters them (`PERSONAL`). This was Claude's default, following the dashboard's rule
  that personal images stay out of public screenshots; ask before changing it.
- **Faces are always plain** on any character, as in the dashboard.
- **Never type Quran text by hand.** Verses come from `data/verses.json`, which the sync script builds
  from the dashboard's `quran.json` (Tanzil, unmodified). The verse list is the dashboard's curated
  `verse.featured`.
- **No sound.** Nothing on the site plays audio.
- **Don't put the home location on the site.** Salah times use city-centre Atlanta coordinates in
  `js/config.js`, never the dashboard's `.env`.
- **Keep Vien's own words.** The page text was carried over from the old site as written; don't
  rewrite facts, dates or claims without being asked.
- **Don't commit or push without being asked.** The user does that.

## Run and deploy

```bash
python3 -m http.server 8000          # preview at http://localhost:8000 (file:// won't work: ES modules)
node tools/sync-dashboard.mjs        # pull engine, scenes, themes, fonts, verses from the dashboard
```

There is **no build step**. GitHub Pages serves the repo as it is (`CNAME` → vienjunaid.com), so
everything the sync writes is committed.

**Preview URL parameters:**

| Parameter | Effect |
|---|---|
| `?prayer=fajr\|dhuhr\|asr\|maghrib\|isha` | Force a prayer period on the home page |
| `&dawn=0..1` | Fajr sunrise progress |
| `?scene=<name>` | Open scenery mode on a scene |
| `&debug` | Renderer, grid size, FPS and ms per frame |
| `&renderer=canvas2d` | Use the fallback renderer |

## Architecture (short version; see ARCHITECTURE.md)

```
index.html           every page's content, as plain HTML (also the no-JavaScript version)
css/site.css         boxes, layout, phone layout, no-JS fallback
js/config.js         pages and scenes, the name, Salah location, verse timing
js/app.js            pages, hash routing, clock, Salah, verse, settings, picker, scenery mode
js/scene-view.js     canvas + pixel wipe            (port of AsciiScene.svelte)
js/pixel-title.js    fly-in pixel titles            (port of PixelTitle.svelte)
js/prayer-times.js   adhan in the browser           (same shape as /api/prayer/today)
js/tools.js          the Tools page's browse ⇄ tool switch (js/tools-*.js are the tools themselves)
js/tools-pdf.js      the Tools page's PDF Converter card
js/tools-video.js    the Tools page's Video Converter card
js/tools-color.js    the Tools page's Color Converter card (no library: the browser is the parser)
js/tools-qr.js       the Tools page's QR Code Generator card
js/tools-image.js    the Tools page's Image Format Converter card
js/engine/           GENERATED: the dashboard's renderer, scenes and lib helpers, TS → JS
js/vendor/           adhan (MIT) is GENERATED, synced from the dashboard; pdf-lib, pdf.js, JSZip,
                     ffmpeg.wasm and qrcode (for js/tools-*.js) are vendored by hand (see
                     "Adding a tool")
data/                GENERATED: scenes.json (scenes + themes + backgrounds + characters), verses.json
fonts/               GENERATED: JetBrains Mono, Amiri Quran (OFL)
tools/               sync-dashboard.mjs
```

- **Generated folders are never edited here.** Change the dashboard, then run the sync.
- **Content is in the HTML**, not in JavaScript. `app.js` shows one `<section class="page">` at a
  time and animates it. Search engines and no-JS visitors get the whole document.
- **`html.js`** is set by an inline script in `<head>`. If the modules fail to load or `boot()`
  throws, it is removed and the site falls back to the plain document.
- **Routing is the URL hash** (`#about`). The dock links are ordinary anchors; `hashchange` calls
  `showPage`. Back and forward work.
- **Visitor settings** live in `localStorage` (`site:prefs`): `hour24`, `verse`, `glass`, and
  `backgrounds` (page id → scene name). There is no server.
- **Panels on text pages are darker** than the dashboard's (`.content { --panel: … }`), because long
  text over a bright daytime theme needs more contrast. Home-page boxes match the dashboard exactly.

## Conventions

- **Adding a page:** add a `<section class="page content" id="…">` in `index.html` (with the
  `page-title` header and its `canvas.banner`), a link in the dock, and an entry in
  `config.pages` with `id`, `label`, `subtitle` and `scene`.
- **Adding an entry:** copy an `article.panel.entry` (Experience) or `article.panel.card` (Projects).
  Give images `width` and `height`, and URL-encode spaces in file names (`SiP%20Lab.png`).
- **Pixel title subtitles must be short**, no wider than the title. The pixels shrink to fit the
  width, so a long subtitle makes the whole title tiny on a phone.
- **Adding a scene:** build it in the dashboard, then sync. It appears in the picker automatically.
- **Class names:** `.label` belongs to Settings rows. Don't reuse it elsewhere (see Gotchas).
- **Adding a tool (Tools page):** the page is a browser of tools (`js/tools.js`), not a wall of
  cards — tapping a `.tool-tile` in `#tools-browse` swaps in that tool's `.tool-view` (a `◀ All
  tools` `.tool-back` button, then a `.panel.card.tool`), and both are hidden until picked. To add
  one: add its tile (`icon`, `name`, `blurb`, `data-tool="<key>"`) to `.tool-grid`, and a
  `<div class="column tool-view" id="tool-view-<key>" hidden>` holding the back button and the
  tool's own `.panel.card.tool` (unique ids inside it, e.g. `tool-<key>-run`). `js/tools.js` only
  handles which view is showing; a tool's own behavior is its own module (`js/tools-pdf.js` is the
  pattern) with an `init…(root)` function called once in `app.js`'s `boot()`, same as `initPdfTool`.
  Keep the card's static shell (buttons, labels, containers) in HTML and only attach behavior in
  JS, same as the rest of the site. Any library the tool needs only it uses: `import()` it lazily
  (on first real use, not on page load) from `js/vendor/`, so other pages stay light. If the
  library has no ES module build, load it as a classic `<script>` injected at runtime (see
  `importJSZip` in `tools-pdf.js`) rather than a static `<script>` tag, for the same reason. Vendor
  the file by hand — these libraries aren't part of the dashboard, so `tools/sync-dashboard.mjs`
  doesn't touch them — fetch the package's browser build (e.g. from
  `cdn.jsdelivr.net/npm/<pkg>@<version>/...`) straight into `js/vendor/`, plus its license file as
  `<name>.LICENSE`, matching how `adhan` is named. If a package has no pre-built browser bundle
  (check its `dist`/`build` folder on jsdelivr first), `cdn.jsdelivr.net/npm/<pkg>@<version>/+esm`
  auto-bundles one on the fly — fetch *that* instead of hand-rolling one, same as `qrcode` (for
  `tools-qr.js`). Check it for bare imports of its own dependencies (e.g. `qrcode` pulls in
  `dijkstrajs`) — jsdelivr points those at itself too, so vendor each one the same way and rewrite
  the import path to the local sibling file, or the tool silently depends on jsdelivr at runtime.
  Check the license of what you vendor: most of these are MIT, but `@ffmpeg/core`
  (`js/vendor/ffmpeg/core/`, used by `tools-video.js`) is GPL — that's fine to redistribute as the
  unmodified compiled build it is, just don't lose the notice.
  **Before building a tool that talks to an outside service** (downloads from a site, calls a
  third-party API, …): this is a static GitHub Pages site with no backend and no secrets store, so
  anything needing a server, an API key, or bypassing a site's own access controls (e.g. a
  YouTube/Spotify/Instagram downloader) isn't a fit here — check with the owner before starting.

## Gotchas already hit

- **`let` before use in `boot()`:** function declarations inside `boot()` are hoisted, but the
  `let`/`const` they touch are not. `prayers` and `refreshPrayers` are declared at the top for this
  reason.
- **Don't recompute `period` inside `refreshPrayers`.** The one-second tick compares the new period
  with the stored one to switch the home scene; if the refresh overwrites it first, the scene never
  changes.
- **adhan reads the calendar day from the Date's local fields.** A visitor in another timezone can be
  on a different day than Atlanta, so `prayer-times.js` builds the date from Atlanta's day.
- **A `.label` class clash** made the Background button wrap into three lines (Settings' `.label` is
  a flex column). The dock's word is `.word`.
- **Resizing rebuilds every scene's static layers.** `scene-view.js` debounces `resize` and skips it
  when the grid size is unchanged. Pages scroll inside their own container, so a phone's URL bar
  doesn't resize the canvas.
- **Screenshot testing:** use `puppeteer-core` with the system Chrome
  (`--use-angle=swiftshader --enable-unsafe-swiftshader`), and wait about 5 s for the title to
  assemble. Headless runs at ~14 fps (software rendering); CPU per frame is about 0.2 ms.
- **Old template leftovers:** `assets/`, `Elements.txt` and `LICENSE.txt` are from the previous
  HTML5 UP template and are unused. They are the owner's to delete. A copy of the old page is at
  `/Users/vien/Documents/LandingPage/index.old.html`.

## Ideas not built yet

- The couple's pixel art on the home scenes (owner's call)
- Hijri and personal-calendar cards on the Projects (Haram) page, as on the dashboard
- A "prayer just started" banner in Arabic, as on the dashboard
- Pixelated versions of the project images
- A contact form
