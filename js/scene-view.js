import { createRenderer, Grid } from './engine/renderer/index.js'
import { GlyphSet, Palette } from './engine/renderer/glyphs.js'
import { startLoop } from './engine/renderer/loop.js'
import { hash } from './engine/scene/pixels.js'
import { createScene } from './engine/scene/scene.js'

const TRANSITION_MS = 900

/**
 * The pixel/ASCII canvas behind every page: a port of the dashboard's AsciiScene.svelte.
 * `pages` are every scene the site can show ({ scene, theme, assets }); `show(i, dir)` switches to
 * one with the pixel wipe.
 */
export function createSceneView(canvas, config, pages) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const debug = new URLSearchParams(location.search).has('debug')
  const stats = debug ? document.body.appendChild(Object.assign(document.createElement('div'), { className: 'stats' })) : null

  // The render loop reads the scene on screen through this box, so switching doesn't rebuild anything.
  const nav = { page: 0, from: 0, start: -1, dir: 1 }

  const renderer = createRenderer(canvas)
  // Every scene shares glyph and color ids, so two of them can be blended cell by cell in the wipe
  const shared = { glyphs: new GlyphSet(), palette: new Palette(pages[0].theme.background) }
  const scenes = pages.map((p) => createScene(p.scene, p.theme, p.assets, shared))
  const edgeGlyphs = ['█', '▓', '▒', '░'].map((c) => shared.glyphs.id(c))
  const edgeColors = pages.map((p) => shared.palette.id(p.theme.accent))
  let grids = []
  let out = new Grid(1, 1)

  const layout = () => {
    const dpr = window.devicePixelRatio || 1
    const { rows: targetRows, cellWidth, cellHeight } = config.grid
    // A fixed row count gives every screen the same composition (a phone is a scaled-down 1080p)
    const ch = Math.max(4, Math.floor((window.innerHeight * dpr) / targetRows))
    const cw = Math.max(2, Math.round((ch * cellWidth) / cellHeight))
    const cols = Math.ceil((window.innerWidth * dpr) / cw)
    const rows = Math.ceil((window.innerHeight * dpr) / ch)
    if (cols === out.cols && rows === out.rows) return
    grids = pages.map(() => new Grid(cols, rows))
    out = new Grid(cols, rows)
    renderer.resize(cols, rows, cw, ch)
    canvas.style.width = `${(cols * cw) / dpr}px`
    canvas.style.height = `${(rows * ch) / dpr}px`
  }
  layout()
  // Scenes rebuild their static layers for a new size, so wait until the window stops moving
  let resizing = 0
  const onResize = () => {
    clearTimeout(resizing)
    resizing = setTimeout(layout, 150)
  }
  window.addEventListener('resize', onResize)

  /**
   * Pixel wipe: the incoming scene sweeps across with a jagged edge of glowing block characters
   * (█▓▒░ in the new scene's accent color).
   */
  function composite(a, b, p, dir, accent) {
    const jag = 10
    const front = p * (out.cols + jag * 2) - jag
    for (let y = 0; y < out.rows; y++)
      for (let x = 0; x < out.cols; x++) {
        const i = y * out.cols + x
        const pos = (dir > 0 ? out.cols - 1 - x : x) + hash(x >> 1, y) * jag
        const d = front - pos
        const src = d > 0 ? b : a
        out.glyphs[i] = src.glyphs[i]
        out.colors[i] = src.colors[i]
        out.bgs[i] = src.bgs[i]
        if (d > -1 && d < 3) {
          out.glyphs[i] = edgeGlyphs[Math.max(0, Math.min(3, Math.floor(d + 1)))]
          out.colors[i] = accent
        }
      }
  }

  let frames = 0, cpu = 0, lastStat = performance.now()
  const stop = startLoop(still ? 4 : config.fps || 20, (t) => {
    const start = performance.now()
    const cur = nav.page
    let target = grids[cur]
    if (nav.start >= 0) {
      const p = (start - nav.start) / TRANSITION_MS
      if (p >= 1) nav.start = -1
      else {
        const eased = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2
        scenes[nav.from].draw(grids[nav.from], t)
        scenes[cur].draw(grids[cur], t)
        composite(grids[nav.from], grids[cur], eased, nav.dir, edgeColors[cur])
        target = out
      }
    }
    if (target !== out) scenes[cur].draw(target, t)
    renderer.draw(target, shared.glyphs, shared.palette)
    cpu += performance.now() - start
    if (stats && ++frames % 30 === 0) {
      const now = performance.now()
      stats.textContent = `${renderer.kind} · ${target.cols}×${target.rows} · ${Math.round((30 * 1000) / (now - lastStat))} fps · ${(cpu / 30).toFixed(1)} ms/frame`
      lastStat = now
      cpu = 0
    }
  })

  return {
    get active() { return nav.page },
    /** Switch to scene `index`; `dir` 1 wipes in from the right, -1 from the left. */
    show(index, dir = 1, wipe = true) {
      if (index === nav.page) return
      nav.from = nav.page
      nav.dir = dir
      nav.page = index
      // Reduced motion: cut straight to the new scene
      nav.start = wipe && !still ? performance.now() : -1
    },
    destroy() {
      stop()
      clearTimeout(resizing)
      window.removeEventListener('resize', onResize)
      renderer.destroy()
    },
  }
}
