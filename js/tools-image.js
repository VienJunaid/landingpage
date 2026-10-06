/*
 * The Image Format Converter card: convert images to PNG, JPEG, WebP or BMP, entirely client-side.
 * PNG/JPEG/WebP use the canvas's own encoder; BMP (which canvas can't write) gets a small hand-rolled
 * 24-bit encoder below — no library needed for any of this. Multiple files zip together (js/vendor/
 * jszip.min.js, already vendored for the PDF and Video tools), loaded lazily like everywhere else.
 */

const baseName = (name) => name.replace(/\.[^./]+$/, '')
const humanSize = (n) => (n < 1024 ? `${n} B` : n < 1_048_576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1_048_576).toFixed(1)} MB`)

/** Two source files can share a basename (photo.png + photo.jpg both → photo.png) — keep both. */
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

// ---------------------------------------------------------------- formats

/** alpha: whether the format keeps transparency (if not, flatten onto white before encoding). */
const FORMATS = {
  png: { ext: 'png', mime: 'image/png', alpha: true },
  jpeg: { ext: 'jpg', mime: 'image/jpeg', alpha: false, quality: 0.92 },
  webp: { ext: 'webp', mime: 'image/webp', alpha: true },
  bmp: { ext: 'bmp', mime: 'image/bmp', alpha: false },
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

function drawToCanvas(img, fillWhite) {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth || img.width
  canvas.height = img.naturalHeight || img.height
  const ctx = canvas.getContext('2d')
  if (fillWhite) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img, 0, 0)
  return canvas
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image'))), mime, quality)
  })
}

/** Uncompressed 24-bit BMP (BITMAPFILEHEADER + BITMAPINFOHEADER, bottom-up rows, 4-byte row padding). */
function encodeBmp({ width, height, data }) {
  const rowSize = Math.ceil((width * 3) / 4) * 4
  const pixelArraySize = rowSize * height
  const fileSize = 54 + pixelArraySize
  const buf = new ArrayBuffer(fileSize)
  const view = new DataView(buf)
  view.setUint8(0, 0x42)
  view.setUint8(1, 0x4d) // "BM"
  view.setUint32(2, fileSize, true)
  view.setUint32(10, 54, true) // pixel data offset
  view.setUint32(14, 40, true) // DIB header size
  view.setInt32(18, width, true)
  view.setInt32(22, height, true)
  view.setUint16(26, 1, true) // planes
  view.setUint16(28, 24, true) // bits per pixel
  view.setUint32(34, pixelArraySize, true)
  view.setInt32(38, 2835, true) // ~72 DPI
  view.setInt32(42, 2835, true)

  const bytes = new Uint8Array(buf)
  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y // BMP rows are bottom-up
    let dest = 54 + y * rowSize
    for (let x = 0; x < width; x++) {
      const src = (srcY * width + x) * 4
      bytes[dest++] = data[src + 2] // B
      bytes[dest++] = data[src + 1] // G
      bytes[dest++] = data[src] // R
    }
  }
  return bytes
}

async function convertImages(files, targetKey, onProgress) {
  const fmt = FORMATS[targetKey]
  const outputs = []
  const usedNames = new Set()
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    onProgress(`Converting ${file.name} (${i + 1}/${files.length})…`)
    const img = await loadImage(file)
    const canvas = drawToCanvas(img, !fmt.alpha)
    const bytes =
      targetKey === 'bmp'
        ? encodeBmp(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height))
        : new Uint8Array(await (await canvasToBlob(canvas, fmt.mime, fmt.quality)).arrayBuffer())
    outputs.push({ name: uniqueName(usedNames, `${baseName(file.name)}.${fmt.ext}`), bytes })
  }
  if (!outputs.length) throw new Error('No output produced')
  if (outputs.length === 1) return { blob: new Blob([outputs[0].bytes], { type: fmt.mime }), name: outputs[0].name }
  const JSZip = await loadJSZip()
  const zip = new JSZip()
  for (const o of outputs) zip.file(o.name, o.bytes)
  return { blob: await zip.generateAsync({ type: 'blob' }), name: 'converted-images.zip' }
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

/** Wire up the Image Format Converter card. `root` is its <article>; no-op if the card isn't on the page. */
export function initImageTool(root) {
  if (!root) return
  const formatButtons = [...root.querySelectorAll('.tool-mode')]
  const drop = root.querySelector('.tool-drop')
  const input = root.querySelector('input[type=file]')
  const list = root.querySelector('.tool-filelist')
  const clearBtn = root.querySelector('.tool-clear')
  const runBtn = root.querySelector('.primary')
  const status = root.querySelector('.tool-status')

  let targetKey = 'png'
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

  function setFormat(key) {
    targetKey = key
    for (const b of formatButtons) {
      const on = b.dataset.mode === key
      b.classList.toggle('on', on)
      b.setAttribute('aria-pressed', String(on))
    }
  }

  function addFiles(incoming) {
    const wanted = [...incoming].filter((f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif|svg|ico|tiff?)$/i.test(f.name))
    if (wanted.length < incoming.length) setStatus(`Skipped ${incoming.length - wanted.length} file(s) that weren’t images.`, 'error')
    files.push(...wanted)
    paintFiles()
  }

  for (const b of formatButtons) b.onclick = () => setFormat(b.dataset.mode)
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
    const busy = [...formatButtons, clearBtn, runBtn]
    for (const b of busy) b.disabled = true
    try {
      setStatus('Starting…', 'busy')
      const result = await convertImages(files, targetKey, (text) => setStatus(text, 'busy'))
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

  setFormat(targetKey)
}
