---
name: test-in-browser
description: Verify a change to vienjunaid.com actually works, by driving a real headless Chromium against the local dev server — screenshots, clicking through the UI, uploading files, capturing triggered downloads, and validating the resulting bytes. Use before reporting any UI or tool change as done. There is no automated test suite for this project; this is the test suite.
---

# Testing vienjunaid.com in a real browser

This project has no test framework — "it works" means a real browser actually ran it and the
output was checked, not that the code reads correctly. Every bug caught in this project so far (a
WASM codec crashing mid-encode, a zip silently dropping a file, a CSS rule silently no-opping
`hidden`, a test harness itself double-counting files) was found this way, not by code review.

## Setup (once per session)

```bash
cd /home/vienly/Projects/landingpage
python3 -m http.server 8000   # from the repo root; leave running in the background
```

In your scratchpad directory (never inside the repo):
```bash
npm init -y
npm install puppeteer-core --no-save   # also jszip/jsqr/pngjs if validating zips/QR codes — see below
```
System Chromium is at `/usr/bin/chromium` (no bundled browser needed). Always launch with:
```js
puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
```
(Software rendering, ~14 fps; fine for correctness checks, CPU per frame is tiny.)

**Reinstalling packages later nukes puppeteer-core.** `npm install <other-pkg> --no-save` against a
`package.json` with no real dependency list prunes anything not declared — if a later install
command reports `removed N packages`, puppeteer-core is probably gone; just reinstall it alongside
whatever you were adding.

## Core patterns

**Load a page and wait for `boot()`** (site has no "ready" event to await; a fixed wait is simplest):
```js
await page.goto('http://127.0.0.1:8000/index.html#tools', { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 1500))
```

**Upload a file to a hidden input** (the real `<input type=file>` is visually hidden via
`clip-path`/`1px` sizing everywhere on this site — that's fine, `uploadFile` doesn't need it
visible):
```js
const input = await page.$('#tool-pdf input[type=file]')
await input.uploadFile('/path/to/file.pdf', '/path/to/other.pdf')
```

**Capture a download** the tool triggers via `a.click()` (every tool on this site downloads this
way, not a visible link):
```js
const client = await page.createCDPSession()
await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOADS_DIR })
```
Then poll the directory for a new filename (`fs.readdir`, diff against a `before` snapshot, ignore
`.crdownload`). **Clear or move downloads between test cases** — two conversions can produce the
same output filename, and headless Chrome's CDP download silently overwrites rather than renaming
`(1)`, `(2)`, etc. the way a real browser UI would. A "file never appeared" failure is often this,
not a real bug — check the previous case's output first before concluding the app is broken.

**Poll a status element instead of a fixed sleep** (conversions vary a lot in duration):
```js
while (Date.now() - start < timeoutMs) {
  const text = await page.$eval('#tool-pdf-status', (el) => el.textContent)
  const cls = await page.$eval('#tool-pdf-status', (el) => el.className)
  if (!cls.includes('busy') && text.trim()) break
  await new Promise((r) => setTimeout(r, 300))
}
```

**Clicking the wrong element of several matches** — once a page has more than one of something
(e.g. two `.tool-back` buttons, one per tool view, only one visible), `page.click('.tool-back')`
grabs the *first in document order*, which may be the hidden one, and fails with "Node is either
not clickable or not an Element". Scope the selector (`#tool-view-video .tool-back`) instead of
assuming uniqueness.

**Checking `hidden`/visibility:** `el.hidden` (the IDL property) only reflects whether the
*attribute* is present — it does **not** tell you whether the element is actually invisible on
screen. A CSS rule can silently defeat `[hidden]` (see the add-tool skill's gotcha about
`.column { display: grid }`). To know what's really rendered, check computed style instead:
```js
await page.$eval(sel, (el) => getComputedStyle(el).display === 'none')
```

## Validating output, not just "a file appeared"

Pick the real tool for the format, not a visual guess:

| Output | Check with |
|---|---|
| PDF | `pdfinfo file.pdf \| grep Pages`, `pdftotext file.pdf -`, `qpdf --show-npages` |
| Image | `identify file.png`, or Python: `from PIL import Image; Image.open(...).getpixel(...)` for exact pixel/alpha checks |
| Video | `ffprobe -v error -show_entries stream=codec_name,width,height -show_entries format=duration file.mp4` |
| Zip | `zipinfo -1 file.zip`, `unzip -l file.zip` |
| QR code | Decode it back independently (`npm install jsqr pngjs`), don't just eyeball the image |

For a from-scratch test fixture, generate it with real tools rather than hand-rolling bytes:
`ffmpeg -f lavfi -i testsrc=...` for video, `python3 -c "from PIL import Image; ..."` for images,
or (cleverest option) the site's own vendored library — e.g. test PDFs for the PDF tool were built
by loading `js/vendor/pdf-lib.esm.min.js` in a blank page and calling it directly.

## Known environment limits (not app bugs)

- **Clipboard access is denied** (`navigator.clipboard.writeText` throws "Write permission denied")
  in this sandboxed headless container, even with `overridePermissions(['clipboard-write'])` and a
  synthetic click. If a tool's error-handling path catches this and shows a sensible fallback
  message, that's success — you can't verify the happy path here, only that it degrades gracefully.
- GPU features aren't available (`--enable-unsafe-swiftshader` forces software rendering); don't
  read a WebGL/GPU-specific failure here as proof of a real bug without also checking it matters.

## Screenshots

Use them to catch layout/visual regressions (overlap, cut-off text, wrong theme colors), but they
cannot substitute for the content checks above — a screenshot of a correctly-rendered UI around a
silently-corrupted output file looks identical to one around a correct file. Take one after any
visual change; take a mobile-width one (390×844) too since this site has a real phone layout.
