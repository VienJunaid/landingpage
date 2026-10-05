# vienjunaid.com

My personal site, in the look of my [RPi Dashboard](https://github.com/VienJunaid/rpi-dashboard): a
pixel-art scene behind every page, Omarchy-style boxes on top, and a home page that follows the prayer
times.

It is a plain static site with no build step. GitHub Pages serves the files as they are.

## Preview

```bash
python3 -m http.server 8000     # → http://localhost:8000
```

It needs a server (not `file://`), because the scripts are ES modules.

| URL | Shows |
|---|---|
| `/?prayer=maghrib` | The home page in that prayer's scene (`fajr`, `dhuhr`, `asr`, `maghrib`, `isha`) |
| `/?prayer=fajr&dawn=0.3` | The Fajr sky at a point in the sunrise |
| `/?scene=kazakh-meadow` | Scenery mode on any scene |
| `/?debug` | Renderer, grid size, FPS and ms per frame |

## Where things are

| To change… | Edit |
|---|---|
| The words, photos and links on any page | `index.html` |
| Pages and their scenes, the name in the sky, the Salah location, verse timing | `js/config.js` |
| Colors of the boxes, layout, phone layout | `css/site.css` |
| Clock, Salah box, verse, settings, background picker | `js/app.js` |

```
index.html           every page's content (also what shows without JavaScript)
css/site.css         the boxes, layout and themes' CSS variables
js/app.js            pages, widgets, settings
js/scene-view.js     the canvas and the pixel wipe (the dashboard's AsciiScene)
js/pixel-title.js    titles that assemble out of pixels (the dashboard's PixelTitle)
js/prayer-times.js   Salah times, calculated in the browser with adhan
js/engine/           generated from the dashboard: renderer, scenes, helpers
data/                generated from the dashboard: scenes + themes + art, and the verses
fonts/               JetBrains Mono, Amiri Quran
tools/               sync-dashboard.mjs
```

## Keeping it in step with the dashboard

`js/engine/`, `data/`, `fonts/` and `js/vendor/` come from the dashboard. Don't edit them here. After
changing art, a scene, a theme or the renderer in the dashboard, pull it in again:

```bash
node tools/sync-dashboard.mjs                      # looks in ../../Work/rpi-dashboard
node tools/sync-dashboard.mjs path/to/rpi-dashboard
```

The sync leaves the couple's characters out (`vien-*`, `wife-*`, `bride-*`, `groom-*`), so the public
site shows the places only. That list is `PERSONAL` at the top of the script.

Visitors' settings (24-hour time, verse on/off, glass blur, chosen backgrounds) are saved in their own
browser and never change the site for anyone else.

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the pieces fit together, and [CLAUDE.md](CLAUDE.md) for
the project's preferences and known traps.

## Credits

- Quran text: [Tanzil](https://tanzil.net) (Uthmani), used unmodified. Translation: Sahih International.
- Fonts: [JetBrains Mono](https://www.jetbrains.com/lp/mono/) and
  [Amiri Quran](https://github.com/aliftype/amiri), SIL Open Font License (see `fonts/`).
- Prayer times: [adhan](https://github.com/batoulapps/adhan-js), MIT.
