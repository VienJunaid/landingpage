#!/usr/bin/env node
/**
 * Pulls the look of the RPi Dashboard into this site, so the two stay identical:
 *
 *   js/engine/       the dashboard's renderer, scene and helper code (TypeScript → plain JS modules)
 *   js/vendor/       adhan (prayer times, MIT)
 *   data/scenes.json every scene with its theme, background and characters
 *   data/verses.json the curated verses, taken from the dashboard's quran.json (never typed by hand)
 *   fonts/           JetBrains Mono and Amiri Quran (OFL)
 *
 * Run it again whenever the dashboard's art or renderer changes:
 *
 *   node tools/sync-dashboard.mjs [path/to/rpi-dashboard]
 *
 * It needs the dashboard's node_modules (for TypeScript and adhan). The site itself has no build
 * step: everything this writes is committed and served as-is by GitHub Pages.
 */
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DASH = path.resolve(process.argv[2] ?? path.join(SITE, '../../Work/rpi-dashboard'))
const SRC = path.join(DASH, 'apps/web/src')

/** Characters that are personal (the couple) stay on the Pi: the public site shows the places only. */
const PERSONAL = /^(vien|wife|bride|groom)-/
/** Scene names that differ here (the wedding scene without the couple is just the arch). */
const RENAME = { 'farooq-wedding': 'farooq-arch' }

if (!existsSync(SRC)) {
  console.error(`No dashboard at ${DASH}\nUsage: node tools/sync-dashboard.mjs [path/to/rpi-dashboard]`)
  process.exit(1)
}

const json = async (file) => JSON.parse(await readFile(file, 'utf8'))
const write = async (file, text) => {
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, text)
}

// ------------------------------------------------------------------ engine (TypeScript → JS)

const ts = createRequire(path.join(DASH, 'package.json'))('typescript')

const ENGINE = [
  'renderer/grid.ts', 'renderer/glyphs.ts', 'renderer/index.ts', 'renderer/loop.ts', 'renderer/webgl.ts', 'renderer/canvas2d.ts',
  'scene/scene.ts', 'scene/pixels.ts', 'scene/characters.ts',
  ...(await readdir(path.join(SRC, 'scene/backgrounds'))).filter((f) => f.endsWith('.ts')).map((f) => `scene/backgrounds/${f}`),
  'lib/color.ts', 'lib/theme.ts', 'lib/prayerClock.ts', 'lib/timeFormat.ts', 'lib/hijri.ts',
  'widgets/clock/digits.ts',
]

const OUT = path.join(SITE, 'js/engine')
await rm(OUT, { recursive: true, force: true })

for (const rel of ENGINE) {
  const from = path.join(SRC, rel)
  const { outputText } = ts.transpileModule(await readFile(from, 'utf8'), {
    fileName: rel,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, removeComments: false },
  })
  // Browsers need real file names: './grid' → './grid.js', './backgrounds' → './backgrounds/index.js'
  const js = outputText.replace(/(from\s+['"])(\.{1,2}\/[^'"]+)(['"])/g, (_, a, spec, b) => {
    const target = path.resolve(path.dirname(from), spec)
    return a + spec + (existsSync(`${target}.ts`) ? '.js' : '/index.js') + b
  })
  await write(
    path.join(OUT, rel.replace(/\.ts$/, '.js')),
    `// Generated from rpi-dashboard/apps/web/src/${rel} by tools/sync-dashboard.mjs. Edit it there.\n${js}`,
  )
}
console.log(`engine    ${ENGINE.length} modules → js/engine/`)

// ------------------------------------------------------------------ scenes, themes, art

const dashboard = await json(path.join(DASH, 'config/dashboard.json'))
const bundle = { scenes: {}, themes: {}, backgrounds: {}, characters: {} }

for (const file of (await readdir(path.join(DASH, 'config/scenes'))).filter((f) => f.endsWith('.json')).sort()) {
  const name = file.replace(/\.json$/, '')
  const scene = await json(path.join(DASH, 'config/scenes', file))
  scene.theme ??= dashboard.theme
  scene.characters = scene.characters.filter((c) => !PERSONAL.test(c.asset))
  bundle.scenes[RENAME[name] ?? name] = scene
  bundle.themes[scene.theme] ??= await json(path.join(DASH, 'config/themes', `${scene.theme}.json`))
  bundle.backgrounds[scene.background] ??= await json(path.join(DASH, 'assets/backgrounds', `${scene.background}.json`))
  for (const c of scene.characters) {
    bundle.characters[c.asset] ??= await json(path.join(DASH, 'assets/characters', `${c.asset}.json`))
  }
}
await write(path.join(SITE, 'data/scenes.json'), JSON.stringify(bundle))
console.log(`scenes    ${Object.keys(bundle.scenes).join(', ')}`)

// ------------------------------------------------------------------ verses

// Same handling as the dashboard's server (services/quran.ts): the Tanzil text stays unmodified; the
// basmala is only split off ayah 1 for display. Letters are compared with the marks stripped, because
// the diacritic order differs between encodings.
const quran = await json(path.join(DASH, 'assets/quran/quran.json'))
const stripMarks = (text) => text.replace(/[ً-ٰٟۖ-ۭ]/g, '')
const BISMILLAH_LETTERS = stripMarks(quran.surahs[0].ayahs[0][0].replace(/^﻿/, ''))

const verses = dashboard.verse.featured.map((key) => {
  const [s, a] = key.split(':').map(Number)
  const surah = quran.surahs[s - 1]
  let arabic = surah.ayahs[a - 1][0].replace(/^﻿/, '')
  let bismillah = null
  const words = arabic.split(' ')
  if (a === 1 && s !== 1 && stripMarks(words.slice(0, 4).join(' ')) === BISMILLAH_LETTERS) {
    bismillah = words.slice(0, 4).join(' ')
    arabic = words.slice(4).join(' ').trim()
  }
  return { key, ayah: a, surah: surah.englishName, arabic, bismillah, translation: surah.ayahs[a - 1][1] }
})
await write(path.join(SITE, 'data/verses.json'), JSON.stringify({ source: quran.source, verses }))
console.log(`verses    ${verses.length}`)

// ------------------------------------------------------------------ fonts, adhan

for (const f of ['JetBrainsMono.ttf', 'AmiriQuran-Regular.ttf', 'OFL-JetBrainsMono.txt', 'OFL-AmiriQuran.txt']) {
  await mkdir(path.join(SITE, 'fonts'), { recursive: true })
  await copyFile(path.join(DASH, 'assets/fonts', f), path.join(SITE, 'fonts', f))
}
await mkdir(path.join(SITE, 'js/vendor'), { recursive: true })
await copyFile(path.join(DASH, 'node_modules/adhan/lib/bundles/adhan.esm.min.js'), path.join(SITE, 'js/vendor/adhan.esm.min.js'))
await copyFile(path.join(DASH, 'node_modules/adhan/LICENSE'), path.join(SITE, 'js/vendor/adhan.LICENSE'))
console.log('fonts     JetBrains Mono, Amiri Quran → fonts/\nadhan     → js/vendor/')
