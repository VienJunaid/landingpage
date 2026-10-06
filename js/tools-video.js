/*
 * The Video Converter card on the Tools page: convert video files between common containers (MP4,
 * WebM, MOV, MKV, AVI) or to an animated GIF, entirely in the browser via ffmpeg.wasm. Nothing is
 * uploaded. The wasm core (js/vendor/ffmpeg/core/) is ~31 MB and is only fetched the first time a
 * conversion actually runs — visiting the Tools page itself doesn't touch it.
 */

const baseName = (name) => name.replace(/\.[^./]+$/, '')
const humanSize = (n) => (n < 1024 ? `${n} B` : n < 1_048_576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1_048_576).toFixed(1)} MB`)

/** Two source files can share a basename (clip.mov + clip.mp4 both → clip.webm) — keep both. */
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

// ---------------------------------------------------------------- ffmpeg.wasm, loaded once

let ffmpegPromise
/** The wasm core only needs fetching and booting once per visit; every conversion reuses it. */
function loadFFmpeg() {
  return (ffmpegPromise ??= (async () => {
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import('./vendor/ffmpeg/index.js'), import('./vendor/ffmpeg/util/index.js')])
    const ffmpeg = new FFmpeg()
    const core = new URL('./vendor/ffmpeg/core/', import.meta.url).href
    const [coreURL, wasmURL] = await Promise.all([
      toBlobURL(`${core}ffmpeg-core.js`, 'text/javascript'),
      toBlobURL(`${core}ffmpeg-core.wasm`, 'application/wasm'),
    ])
    await ffmpeg.load({ coreURL, wasmURL })
    return ffmpeg
  })())
}

// ---------------------------------------------------------------- target formats

/** A broadly-compatible encoder choice per container; gif gets its own palette-based filter. */
const FORMATS = {
  mp4: { ext: 'mp4', mime: 'video/mp4', args: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart'] },
  // libvpx-vp9 crashes this wasm core's runtime ("memory access out of bounds"); libvpx (VP8) is stable.
  webm: { ext: 'webm', mime: 'video/webm', args: ['-c:v', 'libvpx', '-crf', '10', '-b:v', '1M', '-c:a', 'libopus'] },
  mov: { ext: 'mov', mime: 'video/quicktime', args: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac'] },
  mkv: { ext: 'mkv', mime: 'video/x-matroska', args: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac'] },
  avi: { ext: 'avi', mime: 'video/x-msvideo', args: ['-c:v', 'mpeg4', '-q:v', '5', '-c:a', 'libmp3lame'] },
  gif: { ext: 'gif', mime: 'image/gif', args: ['-vf', 'fps=12,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse'] },
}

async function convertVideos(files, targetKey, onProgress) {
  const [ffmpeg, { fetchFile }] = await Promise.all([loadFFmpeg(), import('./vendor/ffmpeg/util/index.js')])
  const fmt = FORMATS[targetKey]
  const onTick = ({ progress }) => {
    if (Number.isFinite(progress) && progress >= 0) onProgress(`Converting — ${Math.round(Math.min(1, progress) * 100)}%`)
  }
  ffmpeg.on('progress', onTick)
  const outputs = []
  const usedNames = new Set()
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      onProgress(`Converting ${file.name} (${i + 1}/${files.length})…`)
      const inName = `in${i}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const outName = `out${i}.${fmt.ext}`
      await ffmpeg.writeFile(inName, await fetchFile(file))
      await ffmpeg.exec(['-i', inName, ...fmt.args, outName])
      const data = await ffmpeg.readFile(outName)
      outputs.push({ name: uniqueName(usedNames, `${baseName(file.name)}.${fmt.ext}`), bytes: data })
      await ffmpeg.deleteFile(inName)
      await ffmpeg.deleteFile(outName)
    }
  } finally {
    ffmpeg.off('progress', onTick)
  }
  if (!outputs.length) throw new Error('No output produced')
  if (outputs.length === 1) return { blob: new Blob([outputs[0].bytes.buffer], { type: fmt.mime }), name: outputs[0].name }
  const JSZip = await loadJSZip()
  const zip = new JSZip()
  for (const o of outputs) zip.file(o.name, o.bytes)
  return { blob: await zip.generateAsync({ type: 'blob' }), name: 'converted-videos.zip' }
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

/** Wire up the Video Converter card. `root` is its <article>; does nothing if the card isn't on the page. */
export function initVideoTool(root) {
  if (!root) return
  const formatButtons = [...root.querySelectorAll('.tool-mode')]
  const drop = root.querySelector('.tool-drop')
  const input = root.querySelector('input[type=file]')
  const list = root.querySelector('.tool-filelist')
  const clearBtn = root.querySelector('.tool-clear')
  const runBtn = root.querySelector('.primary')
  const status = root.querySelector('.tool-status')

  let targetKey = 'mp4'
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
    const wanted = [...incoming].filter((f) => f.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|mkv|avi|flv|wmv|3gp|ogv)$/i.test(f.name))
    if (wanted.length < incoming.length) setStatus(`Skipped ${incoming.length - wanted.length} file(s) that weren’t videos.`, 'error')
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
      setStatus(ffmpegPromise ? 'Starting…' : 'Loading the converter (first time only, ~31 MB)…', 'busy')
      const result = await convertVideos(files, targetKey, (text) => setStatus(text, 'busy'))
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
