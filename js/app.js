import { config } from './config.js'
import { pixelTitle } from './pixel-title.js'
import { prayersToday } from './prayer-times.js'
import { createSceneView } from './scene-view.js'
import { englishDate } from './engine/lib/hijri.js'
import { currentPeriod, PRAYERS, setPrayerData } from './engine/lib/prayerClock.js'
import { applyTheme } from './engine/lib/theme.js'
import { formatTime, is12h, setHour12 } from './engine/lib/timeFormat.js'
import { bigText } from './engine/widgets/clock/digits.js'
import { initToolsHub } from './tools.js'
import { initPdfTool } from './tools-pdf.js'
import { initVideoTool } from './tools-video.js'

/*
 * The site's App.svelte: the pixel-art scene behind everything, the pages in front of it, and the
 * home page's boxes (clock, verse, Salah). The text of every page lives in index.html; this only
 * brings it to life. Settings are per visitor, kept in their browser's localStorage.
 */

const $ = (sel, root = document) => root.querySelector(sel)
/** el('p', { className: 'x' }, 'text', child) */
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props)
  node.append(...children)
  return node
}

// ---------------------------------------------------------------- per-visitor settings

const PREFS_KEY = 'site:prefs'
const prefs = { hour24: false, verse: true, glass: false, /** page id → scene name */ backgrounds: {} }
try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}')) } catch { /* storage blocked: defaults */ }
const savePrefs = () => {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)) } catch { /* this visit only */ }
}

/**
 * What is on screen.
 * - page: index into config.pages
 * - selected: prayer scene picked by tapping it in the Salah box (null = follow the real time)
 * - scenery: only the pixel art; tap left or right to browse every scene
 * - picking: the page whose background is being chosen, or null; preview: the scene shown meanwhile
 */
const view = { page: 0, selected: null, scenery: false, galleryIndex: 0, picking: null, preview: null, settingsOpen: false }

const pages = config.pages
const sections = pages.map((p) => document.getElementById(p.id))
let period // the prayer period it really is, in config.prayer's place

// ---------------------------------------------------------------- scenes

/** Every scene, in gallery order: the prayer scenes, then the pages' scenes, then the rest. */
function loadScenes(bundle) {
  const names = []
  const want = (name) => { if (bundle.scenes[name] && !names.includes(name)) names.push(name) }
  for (const p of pages) for (const name of p.sceneByPrayer ? PRAYERS.map((x) => p.sceneByPrayer[x]) : [p.scene]) want(name)
  Object.keys(bundle.scenes).forEach(want)
  const loaded = names.map((name) => {
    const scene = bundle.scenes[name]
    return {
      scene,
      theme: bundle.themes[scene.theme],
      assets: {
        background: bundle.backgrounds[scene.background],
        characters: new Map(scene.characters.map((c) => [c.asset, bundle.characters[c.asset]])),
      },
    }
  })
  return { names, loaded }
}

const WORDS = { aqsa: 'Al-Aqsa', farooq: 'Al-Farooq', sophia: 'Hagia Sophia' }
/** "aqsa-fajr" → "Al-Aqsa Fajr" */
const pretty = (name) => name.split('-').map((w) => WORDS[w] ?? w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

// ---------------------------------------------------------------- start

async function boot() {
  const [bundle, verseData] = await Promise.all(['data/scenes.json', 'data/verses.json'].map((url) => fetch(url).then((r) => r.json())))
  // The canvas atlas needs the monospace font loaded before it draws glyphs
  await document.fonts.load('16px "JetBrains Mono"').catch(() => {})

  const { names, loaded } = loadScenes(bundle)
  const index = (name) => Math.max(0, names.indexOf(name))

  // Today's times in config.prayer's place (the same shape as the dashboard's /api/prayer/today)
  let prayers
  const refreshPrayers = () => setPrayerData((prayers = prayersToday(config.prayer)))

  setHour12(!prefs.hour24)
  refreshPrayers()
  period = currentPeriod()
  document.documentElement.classList.toggle('glass', prefs.glass)

  /** Which scene a page shows: the one being previewed, then the visitor's choice, then its own. */
  function sceneFor(p) {
    const pc = pages[p]
    const pick = view.picking === p ? view.preview : prefs.backgrounds[pc.id]
    // On the home page, a prayer tapped in the Salah box still previews that prayer's scene
    if (pick && names.includes(pick) && !(view.selected && pc.sceneByPrayer)) return index(pick)
    if (pc.sceneByPrayer) return index(pc.sceneByPrayer[view.selected ?? period?.prayer ?? 'isha'])
    return index(pc.scene)
  }
  const activeScene = () => (view.scenery ? view.galleryIndex : sceneFor(view.page))

  const pageFromHash = () => Math.max(0, pages.findIndex((p) => `#${p.id}` === location.hash))
  view.page = pageFromHash()

  const sceneView = createSceneView($('#scene'), config, loaded)
  /** Bring the canvas and the theme in line with `view`. */
  function refresh(dir = 1, wipe = true) {
    const i = activeScene()
    sceneView.show(i, dir, wipe)
    applyTheme(loaded[i].theme)
    $('meta[name="theme-color"]')?.setAttribute('content', loaded[i].theme.background)
  }
  refresh(1, false)

  // ---- pages

  let stopTitle = () => {}
  let resetTools = () => {}
  /** (Re)start the pixel title of the page on screen, sized to the room it has. */
  function startTitle() {
    stopTitle()
    const p = pages[view.page]
    const section = sections[view.page]
    const canvas = $('canvas.banner', section)
    const room = (p.id === 'home' ? $('.top-center', section) : section).clientWidth
    const title = p.id === 'home' ? config.title : { text: p.label, subtitle: p.subtitle }
    stopTitle = pixelTitle(canvas, { ...title, maxWidth: Math.max(120, room - 48) })
  }

  function showPage(i, dir) {
    const from = view.page
    if (i !== from) {
      const old = sections[from]
      old.classList.remove('active')
      old.classList.add('leaving')
      setTimeout(() => old.classList.remove('leaving'), 250)
      // Arriving at Tools always starts at the tile grid, not whatever tool was last open
      if (pages[i].id === 'tools') resetTools()
    }
    view.page = i
    sections[i].classList.add('active')
    sections[i].scrollTop = 0
    for (const a of document.querySelectorAll('#tabs a')) {
      if (a.getAttribute('href') === `#${pages[i].id}`) a.setAttribute('aria-current', 'page')
      else a.removeAttribute('aria-current')
    }
    document.title = i === 0 ? 'Vien Tran' : `${pages[i].label} · Vien Tran`
    startTitle()
    refresh(dir)
  }

  for (const s of sections) s.classList.remove('active')
  showPage(view.page, 1)

  // Left/right moves between pages with the wipe going the way you went, also across the wrap
  let navDir = null
  let lastNav = 0
  const busy = () => view.settingsOpen || view.picking !== null
  function go(d) {
    if (busy() || performance.now() - lastNav < 950) return
    lastNav = performance.now()
    const dir = d === 'next' ? 1 : -1
    if (view.scenery) {
      view.galleryIndex = (view.galleryIndex + dir + names.length) % names.length
      return refresh(dir)
    }
    navDir = dir
    location.hash = `#${pages[(view.page + dir + pages.length) % pages.length].id}`
  }

  window.addEventListener('hashchange', () => {
    const i = pageFromHash()
    const dir = navDir ?? (i >= view.page ? 1 : -1)
    navDir = null
    if (view.scenery) setScenery(false)
    if (i !== view.page) showPage(i, dir)
  })

  // ---- clock (dashboard: widgets/clock)

  const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  function paintClock() {
    const now = new Date()
    const hour12 = is12h()
    const h = hour12 ? now.getHours() % 12 || 12 : now.getHours()
    $('#clock-time').textContent = bigText(`${hour12 ? h : String(h).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    $('#clock-meridiem').textContent = hour12 ? (now.getHours() < 12 ? 'AM' : 'PM') : ''
    $('#clock-date').textContent = dateFmt.format(now)
    $('#clock-hijri').textContent = `${englishDate(now)} AH`
  }

  // ---- Salah (dashboard: widgets/prayer-times)

  const LABELS = { fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' }
  const rows = new Map()

  function buildSalah() {
    $('#salah-place').textContent = config.prayer.place
    rows.clear()
    $('#salah').replaceChildren(...prayers.times.map((p) => {
      const tappable = PRAYERS.includes(p.name)
      const button = el('button', { type: 'button', disabled: !tappable },
        el('span', { className: 'name' }, LABELS[p.name]),
        el('span', { className: 'dots' }),
        el('span', { className: 'at' }, formatTime(new Date(p.time), prayers.timezone)),
        el('span', { className: 'marker' }),
      )
      if (tappable) {
        button.setAttribute('aria-label', `Show the ${LABELS[p.name]} scene`)
        // Tap a prayer: show its scene; tap it again (or the live prayer) to go back to live
        button.onclick = () => {
          view.selected = view.selected === p.name || p.name === period?.prayer ? null : p.name
          paintSalah()
          refresh(1)
        }
      }
      const li = el('li', { className: p.name === 'sunrise' ? 'dim' : '' }, button)
      rows.set(p.name, li)
      return li
    }))
    paintSalah()
  }

  /** Yellow ◀ = the prayer it really is now; light blue ◆ = the scene picked by tapping a row. */
  function paintSalah() {
    for (const [name, li] of rows) {
      const isLive = name === period?.prayer, isPicked = name === view.selected
      li.classList.toggle('live', isLive)
      li.classList.toggle('picked', isPicked)
      $('button', li).setAttribute('aria-pressed', String(isPicked))
      $('.marker', li).textContent = isPicked ? '◆' : isLive ? '◀' : ' '
    }
    const ms = Math.max(0, Date.parse(prayers.next.time) - Date.now())
    const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000), s = Math.floor((ms % 60_000) / 1000)
    $('#salah-countdown').replaceChildren(
      `${LABELS[prayers.next.name]} in `,
      el('b', {}, h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`),
    )
  }

  // ---- verse (dashboard: widgets/quran-verse). The text comes from data/verses.json, never from here.

  const stack = $('#verse')
  const arabicDigits = (n) => n.toLocaleString('ar-EG', { useGrouping: false })
  let verseAt = Math.floor(Math.random() * verseData.verses.length)
  let verseTimer = 0

  function showVerse() {
    clearTimeout(verseTimer)
    verseTimer = setTimeout(showVerse, Math.max(0.25, config.verse.rotateMinutes) * 60_000)
    // A random step that never lands on the verse already showing
    verseAt = (verseAt + 1 + Math.floor(Math.random() * (verseData.verses.length - 1))) % verseData.verses.length
    const v = verseData.verses[verseAt]
    const figure = el('figure', {},
      el('span', { className: 'ornament', ariaHidden: 'true' }, '۞'),
      ...(v.bismillah ? [el('p', { className: 'bismillah', lang: 'ar', dir: 'rtl' }, v.bismillah)] : []),
      el('blockquote', { lang: 'ar', dir: 'rtl' }, `${v.arabic} `, el('span', { className: 'ayah' }, `۝${arabicDigits(v.ayah)}`)),
      el('p', { className: 'translation' }, `“${v.translation}”`),
      el('figcaption', {}, `— ${v.surah} · ${v.key}`),
    )
    // Old and new share one grid cell, so they crossfade in place
    for (const old of stack.querySelectorAll('figure')) {
      old.classList.remove('in')
      setTimeout(() => old.remove(), 1500)
    }
    stack.append(figure)
    requestAnimationFrame(() => requestAnimationFrame(() => figure.classList.add('in')))
  }

  /** With the verse off, the name takes its place, in the verse's box. */
  function applyVerse() {
    stack.hidden = !prefs.verse
    $('#home-title').classList.toggle('boxed', !prefs.verse)
    clearTimeout(verseTimer)
    if (prefs.verse) showVerse()
    else stack.querySelectorAll('figure').forEach((f) => f.remove())
  }
  $('#verse-next').onclick = showVerse

  // ---- settings (dashboard: Settings.svelte), opened by the clock

  let closeSheet = () => {}
  /** A box in the middle of the screen with a backdrop; returns its element. */
  function openSheet(className, title, label, onClose) {
    closeSheet()
    const backdrop = el('div', { className: `backdrop${className === 'settings' ? ' dark' : ''}` })
    const sheet = el('section', { className: `sheet panel ${className}` }, el('header', {}, title))
    sheet.setAttribute('role', 'dialog')
    sheet.setAttribute('aria-label', label)
    const close = el('button', { className: 'close', ariaLabel: 'Close' }, '✕')
    sheet.append(close)
    const opener = document.activeElement
    closeSheet = () => {
      closeSheet = () => {}
      backdrop.remove()
      sheet.remove()
      onClose()
      opener?.focus?.()
    }
    backdrop.onclick = close.onclick = () => closeSheet()
    document.body.append(backdrop, sheet)
    close.focus()
    return sheet
  }

  function openSettings() {
    view.settingsOpen = true
    const sheet = openSheet('settings', '⚙ Settings', 'Settings', () => (view.settingsOpen = false))

    const action = (name, hint, go, run) =>
      el('button', { className: 'row', onclick: run },
        el('span', { className: 'label' }, el('b', {}, name), el('small', {}, hint)),
        el('span', { className: 'go' }, `${go} ▸`),
      )
    const toggle = (name, hint, key, apply) => {
      const sw = el('span', { className: `switch${prefs[key] ? ' on' : ''}` }, el('span'))
      const row = el('button', { className: 'row' }, el('span', { className: 'label' }, el('b', {}, name), el('small', {}, hint)), sw)
      row.setAttribute('role', 'switch')
      row.setAttribute('aria-checked', String(prefs[key]))
      row.onclick = () => {
        prefs[key] = !prefs[key]
        savePrefs()
        sw.classList.toggle('on', prefs[key])
        row.setAttribute('aria-checked', String(prefs[key]))
        apply()
      }
      return row
    }

    const homeNow = prefs.backgrounds.home ? pretty(prefs.backgrounds.home) : 'Follow prayer times'
    sheet.append(
      action('Scenery mode', 'Only the pixel art. Tap right or left to browse every scene; ✕ at the bottom to return.', 'enter', () => {
        closeSheet()
        setScenery(true)
      }),
      action('Home background', `Now: ${homeNow}. Pick any scene, or follow the prayer times.`, 'change', () => pickBackground(0)),
      toggle('24-hour time', '16:30 instead of 4:30 PM, on the clock and the Salah times.', 'hour24', () => {
        setHour12(!prefs.hour24)
        paintClock()
        buildSalah()
      }),
      toggle('Quran verse', 'The rotating verse at the top of the home page.', 'verse', () => {
        applyVerse()
        if (pages[view.page].id === 'home') startTitle()
      }),
      toggle('Glass blur', 'Frosted blur behind the boxes. Prettier, and harder on a slow device.', 'glass', () => {
        document.documentElement.classList.toggle('glass', prefs.glass)
      }),
    )
  }
  $('#clock').onclick = openSettings

  // ---- background picker (dashboard: BackgroundPicker.svelte)

  /** Choose a page's background. Tapping a scene previews it live behind the picker. */
  function pickBackground(p) {
    const pc = pages[p]
    const saved = prefs.backgrounds[pc.id] ?? null
    view.picking = p
    view.preview = saved
    if (view.page !== p) showPage(p, -1)
    const sheet = openSheet('picker', `▣ ${pc.sceneByPrayer ? 'Home background' : `Background · ${pc.label}`}`, 'Choose a background', () => {
      // Cancel, a tap outside or Esc puts the saved scene back
      view.picking = null
      view.preview = null
      refresh(1)
    })

    const options = []
    const option = (name, text, wide) => {
      const b = el('button', { className: `option${wide ? ' wide' : ''}` }, text, ...(saved === name ? [el('small', {}, ' · current')] : []))
      b.onclick = () => {
        view.preview = name
        paint()
        refresh(1)
      }
      options.push([name, b])
      return b
    }
    const save = el('button', { className: 'action save' }, 'Save')
    const paint = () => {
      for (const [name, b] of options) b.classList.toggle('on', view.preview === name)
      save.disabled = view.preview === saved
    }
    save.onclick = () => {
      if (view.preview) prefs.backgrounds[pc.id] = view.preview
      else delete prefs.backgrounds[pc.id]
      savePrefs()
      closeSheet()
    }
    const cancel = el('button', { className: 'action', onclick: () => closeSheet() }, 'Cancel')

    sheet.append(
      option(null, pc.sceneByPrayer ? 'Follow prayer times' : `Default · ${pretty(pc.scene)}`, true),
      el('div', { className: 'grid' }, ...names.map((name) => option(name, pretty(name)))),
      el('div', { className: 'actions' }, cancel, save),
    )
    paint()
  }
  $('#bg-button').onclick = () => pickBackground(view.page)

  // ---- scenery mode: only the art, and one faint ✕ to come back

  const exit = el('button', { className: 'exit-scenery', ariaLabel: 'Exit scenery mode', onclick: () => setScenery(false) }, '✕')
  function setScenery(on) {
    if (on === view.scenery) return
    // Start from whatever is on screen
    if (on) view.galleryIndex = sceneFor(view.page)
    view.scenery = on
    view.selected = null
    document.body.classList.toggle('scenery', on)
    if (on) document.body.append(exit)
    else exit.remove()
    paintSalah()
    refresh(1)
  }
  // ?scene=<name> opens scenery mode on a scene, like the dashboard
  const wanted = new URLSearchParams(location.search).get('scene')
  if (wanted && names.includes(wanted)) {
    setScenery(true)
    view.galleryIndex = index(wanted)
    refresh(1, false)
  }

  // ---- keys, swipes, taps

  window.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    if (e.key === 'ArrowRight') go('next')
    if (e.key === 'ArrowLeft') go('prev')
    if (e.key === 'Escape') {
      if (busy()) closeSheet()
      else setScenery(false)
    }
  })
  let downX = 0, downY = 0
  window.addEventListener('pointerdown', (e) => ((downX = e.clientX), (downY = e.clientY)))
  window.addEventListener('pointerup', (e) => {
    // Taps on the boxes are theirs, not navigation
    if (busy() || e.target.closest?.('a, button, .panel, figure, .dock, canvas.banner')) return
    const dx = e.clientX - downX, dy = e.clientY - downY
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      if (view.scenery || e.pointerType !== 'mouse') go(dx < 0 ? 'next' : 'prev')
    } else if (view.scenery && Math.hypot(dx, dy) < 10) go(e.clientX > window.innerWidth / 2 ? 'next' : 'prev')
  })

  // The title's pixels are sized to the window, so a new size means a new title
  let resizing = 0, lastWidth = window.innerWidth
  window.addEventListener('resize', () => {
    clearTimeout(resizing)
    resizing = setTimeout(() => {
      if (window.innerWidth === lastWidth) return
      lastWidth = window.innerWidth
      startTitle()
    }, 200)
  })

  // ---- clocks

  paintClock()
  buildSalah()
  applyVerse()
  setInterval(() => {
    paintClock()
    // Just after each prayer time passes, work the times out again so "next" advances
    if (Date.now() > Date.parse(prayers.next.time) + 30_000) {
      refreshPrayers()
      buildSalah()
    }
    const p = currentPeriod()
    if (p?.prayer !== period?.prayer) {
      // A new prayer time brings the home page back to live
      period = p
      view.selected = null
      refresh(1)
    }
    paintSalah()
  }, 1000)
  // A new day
  setInterval(() => { refreshPrayers(); buildSalah() }, 30 * 60_000)

  // ---- tools (js/tools.js, js/tools-pdf.js). Wiring up is cheap; heavy libraries load lazily on first use.
  resetTools = initToolsHub($('#tools'))
  initPdfTool($('#tool-pdf'))
  initVideoTool($('#tool-video'))

  document.body.classList.add('ready')
}

boot().catch((err) => {
  // Fall back to the plain document (see the end of css/site.css)
  console.error(err)
  document.documentElement.classList.remove('js')
})
