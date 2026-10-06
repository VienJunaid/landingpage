/*
 * The Color Converter card: type (or pick) any CSS color and get it back as HEX, RGB and HSL, each
 * with a copy button. Parsing needs no library — an element's computed `color` is the browser's own
 * CSS engine normalizing whatever was typed (a name, rgb(), hsl(), hex, …) into a plain rgb()/rgba().
 */

function parseCssColor(input) {
  const probe = document.createElement('span')
  probe.style.display = 'none'
  probe.style.color = ''
  probe.style.color = input
  if (!probe.style.color) return null
  document.body.append(probe)
  const computed = getComputedStyle(probe).color
  probe.remove()
  const m = computed.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/)
  if (!m) return null
  const [, r, g, b, a] = m
  return { r: +r, g: +g, b: +b, a: a === undefined ? 1 : +a }
}

const hex2 = (n) => Math.round(n).toString(16).padStart(2, '0')
const toHex = ({ r, g, b, a }) => `#${hex2(r)}${hex2(g)}${hex2(b)}${a < 1 ? hex2(a * 255) : ''}`
const toRgbString = ({ r, g, b, a }) => (a < 1 ? `rgb(${r} ${g} ${b} / ${a.toFixed(2)})` : `rgb(${r} ${g} ${b})`)

function toHslString({ r, g, b, a }) {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
  }
  const pct = (n) => Math.round(n * 100)
  return a < 1 ? `hsl(${Math.round(h)} ${pct(s)}% ${pct(l)}% / ${a.toFixed(2)})` : `hsl(${Math.round(h)} ${pct(s)}% ${pct(l)}%)`
}

export function initColorTool(root) {
  if (!root) return
  const text = root.querySelector('#tool-color-text')
  const picker = root.querySelector('#tool-color-picker')
  const results = root.querySelector('#tool-color-results')
  const status = root.querySelector('#tool-color-status')

  function setStatus(msg, kind) {
    status.textContent = msg
    status.classList.toggle('error', kind === 'error')
  }

  function paint(color) {
    const rows = [
      ['HEX', toHex(color)],
      ['RGB', toRgbString(color)],
      ['HSL', toHslString(color)],
    ]
    results.replaceChildren(
      ...rows.map(([label, value]) => {
        const li = document.createElement('li')
        const swatch = Object.assign(document.createElement('span'), { className: 'swatch' })
        swatch.style.background = toRgbString(color)
        const name = Object.assign(document.createElement('span'), { className: 'name', textContent: label })
        const val = Object.assign(document.createElement('span'), { className: 'value', textContent: value })
        const copy = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Copy' })
        copy.onclick = async () => {
          try {
            await navigator.clipboard.writeText(value)
            copy.textContent = 'Copied'
            setTimeout(() => (copy.textContent = 'Copy'), 1200)
          } catch {
            setStatus('Could not copy automatically — select and copy the text instead.', 'error')
          }
        }
        li.append(swatch, name, val, copy)
        return li
      }),
    )
    picker.value = toHex({ ...color, a: 1 })
  }

  function update(value) {
    const color = parseCssColor(value)
    if (!color) {
      setStatus(value ? `“${value}” isn’t a color I recognize.` : '', value ? 'error' : undefined)
      return
    }
    setStatus('')
    paint(color)
  }

  text.oninput = () => update(text.value.trim())
  picker.oninput = () => {
    text.value = picker.value
    update(picker.value)
  }

  text.value = picker.value
  update(picker.value)
}
