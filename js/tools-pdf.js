/*
 * The PDF Converter card on the Tools page: images ⇄ PDF, merging PDFs, and splitting PDFs into a
 * zip of single-page files. Everything runs in the browser — nothing is ever uploaded. The heavy
 * libraries (pdf-lib, pdf.js, JSZip) live in js/vendor/ and are only fetched once a conversion that
 * actually needs them runs, so visiting the Tools page itself stays light.
 */

const baseName = (name) => name.replace(/\.[^./]+$/, '')
const humanSize = (n) => (n < 1024 ? `${n} B` : n < 1_048_576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1_048_576).toFixed(1)} MB`)
const yield_ = () => new Promise((r) => setTimeout(r, 0))

// ---------------------------------------------------------------- vendored libraries, fetched once

let pdfLibPromise, pdfjsPromise, jsZipPromise

const importPdfLib = () => (pdfLibPromise ??= import('./vendor/pdf-lib.esm.min.js'))
const importPdfjs = () =>
  (pdfjsPromise ??= import('./vendor/pdfjs/pdf.min.mjs').then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href
    return lib
  }))
/** JSZip has no ES module build, so it's loaded as a classic script that sets window.JSZip. */
const importJSZip = () =>
  (jsZipPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = new URL('./vendor/jszip.min.js', import.meta.url).href
    s.onload = () => resolve(window.JSZip)
    s.onerror = () => reject(new Error('Could not load the zip library'))
    document.head.append(s)
  }))

// ---------------------------------------------------------------- image/canvas helpers

/** Decode any image the browser can read (jpg, png, webp, gif, …) onto a canvas at its natural size. */
async function fileToCanvas(file) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error(`Could not read "${file.name}" as an image`))
      el.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d').drawImage(img, 0, 0)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

function canvasToPng(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return reject(new Error('Could not encode the image'))
      resolve(new Uint8Array(await blob.arrayBuffer()))
    }, 'image/png')
  })
}

// ---------------------------------------------------------------- the four conversions

async function imagesToPdf(files, onProgress) {
  const { PDFDocument } = await importPdfLib()
  const pdf = await PDFDocument.create()
  for (let i = 0; i < files.length; i++) {
    await onProgress(`Adding ${files[i].name} (${i + 1}/${files.length})…`)
    const canvas = await fileToCanvas(files[i])
    const png = await pdf.embedPng(await canvasToPng(canvas))
    pdf.addPage([canvas.width, canvas.height]).drawImage(png, { x: 0, y: 0, width: canvas.width, height: canvas.height })
  }
  return { blob: new Blob([await pdf.save()], { type: 'application/pdf' }), name: 'images.pdf' }
}

async function pdfToImages(files, onProgress) {
  const pdfjsLib = await importPdfjs()
  const outputs = []
  for (const file of files) {
    const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
    const base = baseName(file.name)
    for (let p = 1; p <= doc.numPages; p++) {
      await onProgress(`Rendering ${file.name} — page ${p}/${doc.numPages}…`)
      const page = await doc.getPage(p)
      const viewport = page.getViewport({ scale: 2 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
      outputs.push({ name: doc.numPages > 1 ? `${base}-p${p}.png` : `${base}.png`, bytes: await canvasToPng(canvas) })
    }
  }
  if (!outputs.length) throw new Error('No pages found')
  if (outputs.length === 1) return { blob: new Blob([outputs[0].bytes], { type: 'image/png' }), name: outputs[0].name }
  const JSZip = await importJSZip()
  const zip = new JSZip()
  for (const o of outputs) zip.file(o.name, o.bytes)
  return { blob: await zip.generateAsync({ type: 'blob' }), name: 'pdf-images.zip' }
}

async function mergePdfs(files, onProgress) {
  const { PDFDocument } = await importPdfLib()
  const merged = await PDFDocument.create()
  for (let i = 0; i < files.length; i++) {
    await onProgress(`Adding ${files[i].name} (${i + 1}/${files.length})…`)
    const src = await PDFDocument.load(await files[i].arrayBuffer())
    for (const page of await merged.copyPages(src, src.getPageIndices())) merged.addPage(page)
  }
  return { blob: new Blob([await merged.save()], { type: 'application/pdf' }), name: 'merged.pdf' }
}

async function splitPdfs(files, onProgress) {
  const { PDFDocument } = await importPdfLib()
  const JSZip = await importJSZip()
  const zip = new JSZip()
  let count = 0
  for (const file of files) {
    const src = await PDFDocument.load(await file.arrayBuffer())
    const base = baseName(file.name)
    for (let i = 0; i < src.getPageCount(); i++) {
      await onProgress(`Splitting ${file.name} — page ${i + 1}/${src.getPageCount()}…`)
      const out = await PDFDocument.create()
      out.addPage((await out.copyPages(src, [i]))[0])
      zip.file(`${base}-p${i + 1}.pdf`, await out.save())
      count++
    }
  }
  if (!count) throw new Error('No pages found')
  return { blob: await zip.generateAsync({ type: 'blob' }), name: 'split-pages.zip' }
}

const MODES = {
  img2pdf: {
    label: 'Images ▸ PDF', kind: 'image', accept: 'image/*', run: imagesToPdf,
    hint: 'Pick one or more images. They’ll become pages of a single PDF, in the order you pick them.',
  },
  pdf2img: {
    label: 'PDF ▸ Images', kind: 'pdf', accept: '.pdf,application/pdf', run: pdfToImages,
    hint: 'Pick one or more PDFs. Every page comes back as a PNG — zipped together if there’s more than one.',
  },
  merge: {
    label: 'Merge PDFs', kind: 'pdf', accept: '.pdf,application/pdf', run: mergePdfs,
    hint: 'Pick two or more PDFs. They’re combined into one, in the order you pick them.',
  },
  split: {
    label: 'Split PDFs', kind: 'pdf', accept: '.pdf,application/pdf', run: splitPdfs,
    hint: 'Pick one or more PDFs. Every page comes back as its own PDF, zipped together.',
  },
}

function download(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

/** Wire up the PDF Converter card. `root` is its <article>; does nothing if the card isn't on the page. */
export function initPdfTool(root) {
  if (!root) return
  const modeButtons = [...root.querySelectorAll('.tool-mode')]
  const hint = root.querySelector('.tool-hint')
  const drop = root.querySelector('.tool-drop')
  const input = root.querySelector('input[type=file]')
  const list = root.querySelector('.tool-filelist')
  const clearBtn = root.querySelector('.tool-clear')
  const runBtn = root.querySelector('.primary')
  const status = root.querySelector('.tool-status')

  let modeKey = 'img2pdf'
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

  function setMode(key) {
    modeKey = key
    const m = MODES[key]
    for (const b of modeButtons) {
      const on = b.dataset.mode === key
      b.classList.toggle('on', on)
      b.setAttribute('aria-pressed', String(on))
    }
    hint.textContent = m.hint
    input.accept = m.accept
    input.multiple = true
    files = []
    paintFiles()
    setStatus('')
  }

  function addFiles(incoming) {
    const m = MODES[modeKey]
    const isMatch = (f) => (m.kind === 'pdf' ? f.type === 'application/pdf' || /\.pdf$/i.test(f.name) : f.type.startsWith('image/'))
    const wanted = [...incoming].filter(isMatch)
    if (wanted.length < incoming.length) setStatus(`Skipped ${incoming.length - wanted.length} file(s) that weren’t ${m.kind === 'pdf' ? 'PDFs' : 'images'}.`, 'error')
    files.push(...wanted)
    paintFiles()
  }

  for (const b of modeButtons) b.onclick = () => setMode(b.dataset.mode)
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
    const busy = [...modeButtons, clearBtn, runBtn]
    for (const b of busy) b.disabled = true
    try {
      setStatus('Starting…', 'busy')
      const result = await MODES[modeKey].run(files, async (text) => {
        setStatus(text, 'busy')
        await yield_()
      })
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

  setMode(modeKey)
}
