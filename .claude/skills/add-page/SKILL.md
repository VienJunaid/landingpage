---
name: add-page
description: Add a new top-level page (like About/Experience/Projects/Resume/Tools) to vienjunaid.com, or add a new entry/card within an existing content page (a project, a job, a credential). Use when asked to add a page, a project, an experience entry, or similar content. Not for the Tools page's own tools — see the add-tool skill for those.
---

# Adding a page or an entry

Content lives in `index.html` as plain HTML — `app.js` only brings it to life (pixel title,
scene, dock highlight). A no-JS visitor and search engines see the whole document, so don't put
content-bearing text into JavaScript.

## Adding a whole new top-level page

Three things, all required:

1. **`index.html`**: a new `<section class="page content" id="<id>" aria-labelledby="<id>-title">`
   (follow the existing pages — `#about`, `#experience`, etc. — exactly), with:
   ```html
   <header class="page-title">
     <h2 id="<id>-title"><Label></h2>
     <canvas class="banner" aria-hidden="true"></canvas>
   </header>
   <div class="column"> <!-- or .column.cards / .column.narrow, see below --> ... </div>
   ```
2. **The dock**: add `<a href="#<id>"><Label></a>` to `#tabs` in the same order you want it in the
   nav and in scenery mode's gallery.
3. **`js/config.js`**: add an entry to `config.pages` — `{ id, label, subtitle, scene }`. `scene`
   must be a name that exists in `data/scenes.json` (run `node tools/sync-dashboard.mjs` first if
   you just built a new one in the dashboard, or reuse an existing unused one — check the table in
   `CLAUDE.md` for which scenes are already claimed by a page).

That's it — `app.js` discovers new pages generically from `config.pages` (hash routing, pixel
title, background picker, dock highlighting all just work).

## Adding an entry within a page

Copy the closest existing pattern, don't invent a new one:

- **A dated role/project with bullet points** (Experience): `article.panel.entry` — image on one
  side (`.shot`, with explicit `width`/`height`), `h3` + `.when` + `ul.points` on the other.
- **A project writeup** (Projects): `article.panel.card` — optional `.shot`, `h3`, then either plain
  `<p>` paragraphs or `.when` + `ul.points`, optional `a.more` link out.
- **A simple row of links** (Resume's Links/Contact, the pixel-title's own nav rows): `ul.rows` —
  `<li><a><span class="name">…</span><span class="dots"></span><span class="go">… ▸</span></a></li>`.

Rules that apply everywhere:
- Images always get explicit `width` and `height` attributes (prevents layout shift; matches every
  existing `<img>` in the file).
- URL-encode spaces and other special characters in file names used in `src`/`href`
  (`SiP%20Lab.png`), don't rename the actual file.
- Never rewrite the owner's own wording, facts, dates, or claims — this text was carried over from
  the old site deliberately. Only touch the words if explicitly asked to.
- A pixel title's `subtitle` (set via `config.pages`, or inline for the home title) must stay short
  — the pixel grid shrinks to fit the available width, so a long subtitle makes the *whole title*
  tiny on a phone. Check it at 390px wide before calling it done (see the test-in-browser skill).

## Verifying it

Use the test-in-browser skill: screenshot the new/changed page at desktop and mobile width, confirm
the pixel title assembled (give it ~1.5–2s after navigation), the dock highlights the right tab,
and — if you changed the scene — that the background picker lists it and switching to it works.
