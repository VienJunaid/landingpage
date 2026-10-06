/*
 * The Qibla Direction card: bearing + distance to the Kaaba, shown on a compass dial, from the
 * visitor's location or manually typed coordinates. Reuses the already-vendored adhan library's own
 * Qibla() great-circle bearing calculation (js/prayer-times.js uses the same file for Salah times)
 * rather than reimplementing it. Location never leaves the browser — no geocoding, no server.
 */

const MECCA = { lat: 21.4225241, lon: 39.8261818 }

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const COMPASS_WORDS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
const compassWord = (deg) => COMPASS_WORDS[Math.round((deg % 360) / 22.5) % 16]

let adhanPromise
const loadAdhan = () => (adhanPromise ??= import('./vendor/adhan.esm.min.js'))

export function initQiblaTool(root) {
  if (!root) return
  const locateBtn = root.querySelector('#tool-qibla-locate')
  const latInput = root.querySelector('#tool-qibla-lat')
  const lonInput = root.querySelector('#tool-qibla-lon')
  const manualBtn = root.querySelector('#tool-qibla-manual')
  const compass = root.querySelector('#tool-qibla-compass')
  const needle = root.querySelector('#tool-qibla-needle')
  const reading = root.querySelector('#tool-qibla-reading')
  const sensorBtn = root.querySelector('#tool-qibla-sensor')
  const status = root.querySelector('#tool-qibla-status')

  let bearing = null
  let deviceHeading = null
  let sensorOn = false
  let orientationHandler = null

  function setStatus(text, kind) {
    status.textContent = text
    status.classList.toggle('error', kind === 'error')
  }

  function paintNeedle() {
    const rotation = deviceHeading != null ? bearing - deviceHeading : bearing
    needle.style.transform = `rotate(${rotation}deg)`
  }

  async function showFor(lat, lon) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setStatus('That doesn’t look like a valid latitude/longitude.', 'error')
      return
    }
    const { Qibla, Coordinates } = await loadAdhan()
    bearing = Qibla(new Coordinates(lat, lon))
    const distanceKm = haversineKm(lat, lon, MECCA.lat, MECCA.lon)
    compass.hidden = false
    reading.replaceChildren(
      document.createTextNode(`${bearing.toFixed(1)}° `),
      Object.assign(document.createElement('b'), { textContent: compassWord(bearing) }),
      document.createTextNode(` from true north — ${Math.round(distanceKm).toLocaleString()} km to the Kaaba`),
    )
    paintNeedle()
    setStatus('')
  }

  locateBtn.onclick = () => {
    if (!navigator.geolocation) {
      setStatus('Your browser doesn’t support geolocation — try entering coordinates manually.', 'error')
      return
    }
    setStatus('Locating…')
    locateBtn.disabled = true
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locateBtn.disabled = false
        latInput.value = pos.coords.latitude.toFixed(5)
        lonInput.value = pos.coords.longitude.toFixed(5)
        showFor(pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        locateBtn.disabled = false
        setStatus(`Could not get your location (${err.message}). Try entering coordinates manually.`, 'error')
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  manualBtn.onclick = () => showFor(parseFloat(latInput.value), parseFloat(lonInput.value))
  for (const el of [latInput, lonInput]) {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') manualBtn.click()
    })
  }

  sensorBtn.onclick = async () => {
    if (sensorOn) {
      sensorOn = false
      deviceHeading = null
      sensorBtn.textContent = 'Use device compass'
      if (orientationHandler) {
        window.removeEventListener('deviceorientationabsolute', orientationHandler)
        window.removeEventListener('deviceorientation', orientationHandler)
      }
      paintNeedle()
      return
    }
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const perm = await DeviceOrientationEvent.requestPermission()
        if (perm !== 'granted') {
          setStatus('Compass access was denied.', 'error')
          return
        }
      } catch {
        setStatus('Could not request compass access.', 'error')
        return
      }
    }
    orientationHandler = (e) => {
      const heading = typeof e.webkitCompassHeading === 'number' ? e.webkitCompassHeading : e.absolute && typeof e.alpha === 'number' ? 360 - e.alpha : null
      if (heading != null) {
        deviceHeading = heading
        paintNeedle()
      }
    }
    window.addEventListener('deviceorientationabsolute', orientationHandler)
    window.addEventListener('deviceorientation', orientationHandler)
    sensorOn = true
    sensorBtn.textContent = 'Stop using device compass'
  }
}
