/*
 * The Pixel Art / ASCII Art card: turn a photo into blocky retro pixel art (with an optional retro
 * color palette) or rendered ASCII text art, entirely via canvas — no library needed, same spirit as
 * the Color Converter. Multiple files zip together like every other tool here.
 */

const baseName = (name) => name.replace(/\.[^./]+$/, '')
const humanSize = (n) => (n < 1024 ? `${n} B` : n < 1_048_576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1_048_576).toFixed(1)} MB`)

function uniqueName(used, name) {
  if (!used.has(name)) {
    used.add(name)
    return name
  }
  const dot = name.lastIndexOf('.')
  const stem = dot === -1 ? name : name.slice(0, dot)
  const ext = dot === -1 ? '' : name.slice(dot)
  let n = 2
  while (used.has(`${stem} (${n})${ext}`)) n++
  const unique = `${stem} (${n})${ext}`
  used.add(unique)
  return unique
}

async function loadImage(file) {
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`Could not read "${file.name}" as an image`))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

// ---------------------------------------------------------------- pixel art

const PALETTES = {
  none: null,
  gray: [[0, 0, 0], [51, 51, 51], [102, 102, 102], [153, 153, 153], [204, 204, 204], [255, 255, 255]],
  gameboy: [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]],
  retro16: [
    [0, 0, 0], [85, 85, 85], [170, 170, 170], [255, 255, 255],
    [170, 0, 0], [255, 85, 85], [0, 170, 0], [85, 255, 85],
    [170, 85, 0], [255, 255, 85], [0, 0, 170], [85, 85, 255],
    [170, 0, 170], [255, 85, 255], [0, 170, 170], [85, 255, 255],
  ],
}

function quantizeToPalette(data, palette) {
  for (let i = 0; i < data.length; i += 4) {
    let best = 0
    let bestDist = Infinity
    for (let p = 0; p < palette.length; p++) {
      const [pr, pg, pb] = palette[p]
      const dr = data[i] - pr
      const dg = data[i + 1] - pg
      const db = data[i + 2] - pb
      const dist = dr * dr + dg * dg + db * db
      if (dist < bestDist) {
        bestDist = dist
        best = p
      }
    }
    const [r, g, b] = palette[best]
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
  }
}

function pixelate(img, blockSize, paletteKey) {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const smallW = Math.max(1, Math.round(w / blockSize))
  const smallH = Math.max(1, Math.round(h / blockSize))
  const small = document.createElement('canvas')
  small.width = smallW
  small.height = smallH
  const sctx = small.getContext('2d')
  sctx.drawImage(img, 0, 0, smallW, smallH)
  const palette = PALETTES[paletteKey]
  if (palette) {
    const imageData = sctx.getImageData(0, 0, smallW, smallH)
    quantizeToPalette(imageData.data, palette)
    sctx.putImageData(imageData, 0, 0)
  }
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const octx = out.getContext('2d')
  octx.imageSmoothingEnabled = false
  octx.drawImage(small, 0, 0, w, h)
  return out
}

// ---------------------------------------------------------------- ascii art

const ASCII_RAMP = " .'`^\",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"
const CELL_W = 7
const CELL_H = 13
const FONT = `${CELL_H - 2}px "JetBrains Mono", monospace`

function imageToAsciiGrid(img, cols) {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const rows = Math.max(1, Math.round(cols * (h / w) * (CELL_W / CELL_H)))
  const canvas = document.createElement('canvas')
  canvas.width = cols
  canvas.height = rows
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, cols, rows)
  const { data } = ctx.getImageData(0, 0, cols, rows)
  const grid = []
  for (let y = 0; y < rows; y++) {
    const row = []
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      const idx = Math.min(ASCII_RAMP.length - 1, Math.floor((1 - lum) * ASCII_RAMP.length))
      row.push({ ch: ASCII_RAMP[idx], r, g, b })
    }
    grid.push(row)
  }
  return grid
}

async function renderAscii(grid, colorMode) {
  await document.fonts.load(FONT)
  const canvas = document.createElement('canvas')
  canvas.width = grid[0].length * CELL_W
  canvas.height = grid.length * CELL_H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0b0c10'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.font = FONT
  ctx.textBaseline = 'top'
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const cell = grid[y][x]
      if (cell.ch === ' ') continue
      ctx.fillStyle = colorMode === 'color' ? `rgb(${cell.r},${cell.g},${cell.b})` : '#9ece6a'
      ctx.fillText(cell.ch, x * CELL_W, y * CELL_H)
    }
  }
  return canvas
}

// ---------------------------------------------------------------- shared

function canvasToPng(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image'))), 'image/png')
  })
}

async function convert(files, opts, onProgress) {
  const outputs = []
  const usedNames = new Set()
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    onProgress(`Converting ${file.name} (${i + 1}/${files.length})…`)
    const img = await loadImage(file)
    const canvas =
      opts.style === 'pixelate' ? pixelate(img, opts.blockSize, opts.palette) : await renderAscii(imageToAsciiGrid(img, opts.asciiWidth), opts.asciiColor)
    const blob = await canvasToPng(canvas)
    const name = uniqueName(usedNames, `${baseName(file.name)}-${opts.style}.png`)
    outputs.push({ name, bytes: new Uint8Array(await blob.arrayBuffer()) })
  }
  if (!outputs.length) throw new Error('No output produced')
  if (outputs.length === 1) return { blob: new Blob([outputs[0].bytes], { type: 'image/png' }), name: outputs[0].name }
  const JSZip = await loadJSZip()
  const zip = new JSZip()
  for (const o of outputs) zip.file(o.name, o.bytes)
  return { blob: await zip.generateAsync({ type: 'blob' }), name: 'retro-images.zip' }
}

/** JSZip has no ES module build, so it's loaded as a classic script that sets window.JSZip. */
let jsZipPromise
function loadJSZip() {
  return (jsZipPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = new URL('./vendor/jszip.min.js', import.meta.url).href
    s.onload = () => resolve(window.JSZip)
    s.onerror = () => reject(new Error('Could not load the zip library'))
    document.head.append(s)
  }))
}

function download(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

/** Wire up the Pixel Art / ASCII Art card. `root` is its <article>; no-op if the card isn't on the page. */
export function initPixelArtTool(root) {
  if (!root) return
  const styleButtons = [...root.querySelectorAll('.tool-modes[aria-label="Style"] .tool-mode')]
  const paletteButtons = [...root.querySelectorAll('.tool-modes[aria-label="Palette"] .tool-mode')]
  const asciiColorButtons = [...root.querySelectorAll('.tool-modes[aria-label="Color"] .tool-mode')]
  const pixelateOptions = root.querySelector('#tool-pixelart-pixelate-options')
  const asciiOptions = root.querySelector('#tool-pixelart-ascii-options')
  const blockSize = root.querySelector('#tool-pixelart-blocksize')
  const blockSizeOut = root.querySelector('#tool-pixelart-blocksize-out')
  const asciiWidth = root.querySelector('#tool-pixelart-asciiwidth')
  const asciiWidthOut = root.querySelector('#tool-pixelart-asciiwidth-out')
  const drop = root.querySelector('.tool-drop')
  const input = root.querySelector('input[type=file]')
  const list = root.querySelector('.tool-filelist')
  const clearBtn = root.querySelector('.tool-clear')
  const runBtn = root.querySelector('.primary')
  const status = root.querySelector('.tool-status')

  let style = 'pixelate'
  let palette = 'none'
  let asciiColor = 'mono'
  let files = []

  function setStatus(text, kind) {
    status.textContent = text
    status.classList.toggle('busy', kind === 'busy')
    status.classList.toggle('error', kind === 'error')
  }

  function paintFiles() {
    list.replaceChildren(
      ...files.map((f, i) => {
        const li = document.createElement('li')
        const name = Object.assign(document.createElement('span'), { className: 'name', textContent: f.name })
        const size = Object.assign(document.createElement('span'), { className: 'size', textContent: humanSize(f.size) })
        const remove = Object.assign(document.createElement('button'), { type: 'button', textContent: '✕' })
        remove.setAttribute('aria-label', `Remove ${f.name}`)
        remove.onclick = () => {
          files.splice(i, 1)
          paintFiles()
        }
        li.append(name, size, remove)
        return li
      }),
    )
    clearBtn.disabled = runBtn.disabled = files.length === 0
  }

  function setStyle(key) {
    style = key
    for (const b of styleButtons) {
      const on = b.dataset.mode === key
      b.classList.toggle('on', on)
      b.setAttribute('aria-pressed', String(on))
    }
    pixelateOptions.hidden = key !== 'pixelate'
    asciiOptions.hidden = key !== 'ascii'
  }

  const selectIn = (buttons, value, apply) => {
    for (const b of buttons) {
      const on = b === value
      b.classList.toggle('on', on)
      b.setAttribute('aria-pressed', String(on))
    }
    apply()
  }

  for (const b of styleButtons) b.onclick = () => setStyle(b.dataset.mode)
  for (const b of paletteButtons) {
    b.onclick = () => {
      palette = b.dataset.palette
      selectIn(paletteButtons, b, () => {})
    }
  }
  for (const b of asciiColorButtons) {
    b.onclick = () => {
      asciiColor = b.dataset.asciiColor
      selectIn(asciiColorButtons, b, () => {})
    }
  }
  blockSize.oninput = () => (blockSizeOut.textContent = `${blockSize.value}px`)
  asciiWidth.oninput = () => (asciiWidthOut.textContent = `${asciiWidth.value} cols`)

  function addFiles(incoming) {
    const wanted = [...incoming].filter((f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(f.name))
    if (wanted.length < incoming.length) setStatus(`Skipped ${incoming.length - wanted.length} file(s) that weren’t images.`, 'error')
    files.push(...wanted)
    paintFiles()
  }

  input.onchange = () => {
    addFiles(input.files)
    input.value = ''
  }
  drop.addEventListener('dragover', (e) => {
    e.preventDefault()
    drop.classList.add('over')
  })
  drop.addEventListener('dragleave', () => drop.classList.remove('over'))
  drop.addEventListener('drop', (e) => {
    e.preventDefault()
    drop.classList.remove('over')
    addFiles(e.dataTransfer.files)
  })
  clearBtn.onclick = () => {
    files = []
    paintFiles()
    setStatus('')
  }

  runBtn.onclick = async () => {
    if (!files.length) return
    const busy = [...styleButtons, ...paletteButtons, ...asciiColorButtons, clearBtn, runBtn]
    for (const b of busy) b.disabled = true
    try {
      setStatus('Starting…', 'busy')
      const opts = { style, blockSize: +blockSize.value, palette, asciiWidth: +asciiWidth.value, asciiColor }
      const result = await convert(files, opts, (text) => setStatus(text, 'busy'))
      download(result.blob, result.name)
      setStatus(`Done — downloaded ${result.name}`)
    } catch (err) {
      console.error(err)
      setStatus(err.message || 'Something went wrong.', 'error')
    } finally {
      for (const b of busy) b.disabled = false
      clearBtn.disabled = runBtn.disabled = files.length === 0
    }
  }

  setStyle(style)
  selectIn(paletteButtons, paletteButtons[0], () => {})
  selectIn(asciiColorButtons, asciiColorButtons[0], () => {})
  blockSizeOut.textContent = `${blockSize.value}px`
  asciiWidthOut.textContent = `${asciiWidth.value} cols`
}
