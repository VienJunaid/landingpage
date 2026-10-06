/*
 * The QR Code Generator card: type text or a link, get a live-updating QR code, download it as a
 * PNG. Uses the vendored `qrcode` library (js/vendor/qrcode/), loaded lazily on first input.
 */

let qrPromise
const loadQR = () => (qrPromise ??= import('./vendor/qrcode/qrcode.js'))

export function initQrTool(root) {
  if (!root) return
  const textarea = root.querySelector('#tool-qr-text')
  const preview = root.querySelector('#tool-qr-preview')
  const canvas = root.querySelector('#tool-qr-canvas')
  const clearBtn = root.querySelector('#tool-qr-clear')
  const downloadBtn = root.querySelector('#tool-qr-download')
  const status = root.querySelector('#tool-qr-status')

  let timer = 0

  function setStatus(msg, kind) {
    status.textContent = msg
    status.classList.toggle('error', kind === 'error')
  }

  async function render() {
    const value = textarea.value.trim()
    if (!value) {
      preview.hidden = true
      clearBtn.disabled = downloadBtn.disabled = true
      setStatus('')
      return
    }
    try {
      const QR = await loadQR()
      await QR.toCanvas(canvas, value, { width: 288, margin: 2 })
      preview.hidden = false
      clearBtn.disabled = downloadBtn.disabled = false
      setStatus('')
    } catch (err) {
      preview.hidden = true
      downloadBtn.disabled = true
      clearBtn.disabled = false
      setStatus(/big|long|capacity/i.test(err?.message ?? '') ? 'That’s too much text for a QR code — try something shorter.' : 'Could not generate a QR code for that.', 'error')
    }
  }

  textarea.oninput = () => {
    clearTimeout(timer)
    timer = setTimeout(render, 200)
  }
  clearBtn.onclick = () => {
    textarea.value = ''
    render()
    textarea.focus()
  }
  downloadBtn.onclick = () => {
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'qr-code.png'
    a.click()
  }
}
