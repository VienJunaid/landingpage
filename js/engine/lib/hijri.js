// Generated from rpi-dashboard/apps/web/src/lib/hijri.ts by tools/sync-dashboard.mjs. Edit it there.
/**
 * Hijri dates and the important days of the Islamic year, worked out offline from the Umm al-Qura
 * calendar in Intl (the same one the clock uses). US masjids sometimes start a month a day apart
 * from Umm al-Qura, so `dashboard.json → hijri.offset` (−1, 0, +1) shifts every Hijri date shown.
 */
const DAY = 86_400_000;
let offset = 0;
export function setHijriOffset(days) {
    offset = Math.max(-2, Math.min(2, Math.round(days ?? 0)));
}
/** The Gregorian instant whose Umm al-Qura date is the adjusted Hijri date of `date`. */
export const shifted = (date) => new Date(date.getTime() + offset * DAY);
const partsFmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' });
const arFmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' });
const arMonthFmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { month: 'long' });
export function toHijri(date = new Date()) {
    const out = { day: 0, month: 0, year: 0 };
    for (const p of partsFmt.formatToParts(shifted(date))) {
        if (p.type === 'day' || p.type === 'month' || p.type === 'year')
            out[p.type] = Number(p.value);
    }
    return out;
}
export const MONTHS = [
    'Muharram', 'Safar', 'Rabiʿ al-Awwal', 'Rabiʿ al-Thani', 'Jumada al-Ula', 'Jumada al-Akhirah',
    'Rajab', 'Shaʿban', 'Ramadan', 'Shawwal', 'Dhul-Qaʿdah', 'Dhul-Hijjah',
];
/** For tight spots, e.g. the 1st of each month in the calendar grid. */
export const MONTHS_SHORT = ['Muh', 'Saf', 'Rab I', 'Rab II', 'Jum I', 'Jum II', 'Raj', 'Shaʿ', 'Ram', 'Shaw', 'Dhul-Q', 'Dhul-H'];
/** "١٧ ربيع الآخر ١٤٤٨ هـ" */
export const arabicDate = (date = new Date()) => arFmt.format(shifted(date));
/** "17 Rabiʿ al-Thani 1448" */
export function englishDate(date = new Date()) {
    const h = toHijri(date);
    return `${h.day} ${MONTHS[h.month - 1]} ${h.year}`;
}
/** Local noon, `n` days after `d` (noon keeps DST changes from skipping or repeating a day). */
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
const yearCache = new Map();
/** The twelve months of Hijri `year`, with the Gregorian day each one starts on. */
export function hijriYear(year) {
    const key = `${year}:${offset}`;
    const hit = yearCache.get(key);
    if (hit)
        return hit;
    // 1 Muharram 1 AH ≈ 16 July 622; a Hijri year is ≈ 354.367 days. Scan from a little before.
    const epoch = Date.UTC(622, 6, 16);
    const guess = new Date(epoch + (year - 1) * 354.367 * DAY);
    let d = addDays(new Date(guess.getUTCFullYear(), guess.getUTCMonth(), guess.getUTCDate()), -20);
    const months = [];
    for (let i = 0; i < 400; i++, d = addDays(d, 1)) {
        const h = toHijri(d);
        if (h.year < year)
            continue;
        if (h.year > year)
            break;
        const m = months[h.month - 1];
        if (m)
            m.days = Math.max(m.days, h.day);
        else
            months[h.month - 1] = { month: h.month, year, name: MONTHS[h.month - 1], nameAr: arMonthFmt.format(shifted(d)), start: addDays(d, 1 - h.day), days: h.day };
    }
    yearCache.set(key, months);
    return months;
}
/** Gregorian day (local noon) of a Hijri date. */
export const gregorian = (m, day) => addDays(m.start, day - 1);
// Only days with wide agreement. Add more here if you want them (e.g. 27 Rajab).
const EVENTS = [
    { month: 1, day: 1, name: 'Islamic New Year' },
    { month: 1, day: 9, length: 2, name: 'Ashura', note: 'Fast the 9th and 10th' },
    { month: 9, day: 1, length: 'rest', name: 'Ramadan' },
    { month: 9, day: 21, length: 'rest', name: 'Last ten nights', note: 'Seek Laylat al-Qadr' },
    { month: 10, day: 1, name: 'Eid al-Fitr' },
    { month: 10, day: 2, length: 'rest', name: 'Six days of Shawwal', note: 'Fast any six days', minor: true },
    { month: 12, day: 1, length: 10, name: 'First ten days', note: 'The best days of the year' },
    { month: 12, day: 9, name: 'Day of Arafah', note: 'Fast if not on Hajj' },
    { month: 12, day: 10, name: 'Eid al-Adha' },
    { month: 12, day: 11, length: 3, name: 'Days of Tashreeq' },
];
/** Every important day of Hijri `year`, in order, with the white days (13–15) of each month. */
export function islamicEvents(year) {
    const months = hijriYear(year);
    const out = [];
    for (const m of months) {
        if (!m)
            continue;
        const add = (day, length, e) => out.push({ ...e, month: m.month, year, start: gregorian(m, day), end: gregorian(m, day + length - 1) });
        for (const e of EVENTS) {
            if (e.month !== m.month)
                continue;
            add(e.day, e.length === 'rest' ? m.days - e.day + 1 : e.length ?? 1, { name: e.name, note: e.note, minor: e.minor });
        }
        // White days: not in Ramadan (already fasting) or Dhul-Hijjah (the 13th is a day of Tashreeq)
        if (m.month !== 9 && m.month !== 12)
            add(13, 3, { name: 'White days', note: 'Fast the 13th, 14th and 15th', minor: true });
    }
    return out.sort((a, b) => a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime());
}
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** Whole days from today until `d` (0 = today). */
export const daysUntil = (d, now = new Date()) => Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / DAY);
/** The next `n` events that haven't ended (this year and next); `minor`: only fasting days, or none. */
export function upcoming(n, minor, now = new Date()) {
    const { year } = toHijri(now);
    return [...islamicEvents(year), ...islamicEvents(year + 1)]
        .filter((e) => daysUntil(e.end, now) >= 0 && (minor === undefined || !!e.minor === minor))
        .slice(0, n);
}
const md = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
/** "Oct 5", "Oct 5–7", "Sep 30 – Oct 2" */
export function dateRange(start, end) {
    if (daysUntil(end, start) === 0)
        return md.format(start);
    if (start.getMonth() === end.getMonth())
        return `${md.format(start)}–${end.getDate()}`;
    return `${md.format(start)} – ${md.format(end)}`;
}
/** "today", "tomorrow", "in 12 days", "now" (for a span that has started). */
export function relative(e, now = new Date()) {
    const n = daysUntil(e.start, now);
    if (n < 0)
        return daysUntil(e.end, now) >= 0 ? 'now' : '';
    return n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`;
}
