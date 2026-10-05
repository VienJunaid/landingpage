import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from './vendor/adhan.esm.min.js'

const NAMES = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']

/**
 * Today's prayer times, calculated in the browser with adhan: the same answer the dashboard's
 * server gives at /api/prayer/today ({ times, next, current, timezone }).
 * `prayer` is config.prayer: { latitude, longitude, timezone, method, madhab }.
 */
export function prayersToday(prayer, now = new Date()) {
  const params = (CalculationMethod[prayer.method] ?? CalculationMethod.NorthAmerica)()
  params.madhab = prayer.madhab === 'Hanafi' ? Madhab.Hanafi : Madhab.Shafi
  const coords = new Coordinates(prayer.latitude, prayer.longitude)

  // adhan reads the calendar day from the date's local fields. A visitor elsewhere in the world can
  // be on another day than the place the times are for, so ask for that place's day.
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: prayer.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (type) => Number(parts.find((p) => p.type === type).value)
  const day = new Date(part('year'), part('month') - 1, part('day'))
  const today = new PrayerTimes(coords, day, params)
  const tomorrow = new PrayerTimes(coords, new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1), params)

  const nextName = today.nextPrayer(now)
  return {
    times: NAMES.map((name) => ({ name, time: today[name].toISOString() })),
    next: nextName === 'none'
      ? { name: 'fajr', time: tomorrow.fajr.toISOString() }
      : { name: nextName, time: today.timeForPrayer(nextName).toISOString() },
    current: today.currentPrayer(now),
    timezone: prayer.timezone,
  }
}
