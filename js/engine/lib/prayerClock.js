// Generated from rpi-dashboard/apps/web/src/lib/prayerClock.ts by tools/sync-dashboard.mjs. Edit it there.
/**
 * Shared prayer-time state for the UI: which prayer period we're in, when it started, and how far
 * along dawn is (for the Fajr sunrise). App.svelte keeps it fresh; scenes and widgets read it.
 *
 * Preview any period without waiting: ?prayer=asr   (fajr | dhuhr | asr | maghrib | isha)
 *   ?dawn=0.3   force the Fajr sunrise progress (0 = dark dawn, 1 = sun up)
 *   ?banner     show the "prayer just started" animation
 */
export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const PRAYER_NAMES = {
    fajr: { en: 'Fajr', ar: 'الفجر' },
    dhuhr: { en: 'Dhuhr', ar: 'الظهر' },
    asr: { en: 'Asr', ar: 'العصر' },
    maghrib: { en: 'Maghrib', ar: 'المغرب' },
    isha: { en: 'Isha', ar: 'العشاء' },
};
const params = new URLSearchParams(location.search);
const forcedPrayer = params.get('prayer');
const forcedDawn = params.get('dawn');
export const forceBanner = params.has('banner');
let data;
export function setPrayerData(d) {
    data = d;
}
const at = (name) => {
    const t = data?.times.find((x) => x.name === name)?.time;
    return t ? new Date(t) : undefined;
};
/** The next of the five prayers after `now` (tomorrow's Fajr after Isha). */
export function nextPrayer(now = new Date()) {
    for (const p of PRAYERS) {
        const t = at(p);
        if (t && t > now)
            return { prayer: p, time: t };
    }
    // After Isha the server's `next` is tomorrow's Fajr; otherwise add a day to today's
    if (data?.next.name === 'fajr' && new Date(data.next.time) > now)
        return { prayer: 'fajr', time: new Date(data.next.time) };
    const fajr = at('fajr');
    return fajr ? { prayer: 'fajr', time: new Date(fajr.getTime() + 86_400_000) } : undefined;
}
/** The prayer period `now` falls in: Fajr runs until Dhuhr, Isha until the next Fajr. */
export function currentPeriod(now = new Date()) {
    if (forcedPrayer && PRAYERS.includes(forcedPrayer)) {
        return { prayer: forcedPrayer, start: new Date(now.getTime() - (forceBanner ? 0 : 3_600_000)), end: new Date(now.getTime() + 3_600_000) };
    }
    const fajr = at('fajr'), dhuhr = at('dhuhr'), asr = at('asr'), maghrib = at('maghrib'), isha = at('isha');
    if (!fajr || !dhuhr || !asr || !maghrib || !isha)
        return undefined;
    const day = 86_400_000;
    if (now < fajr)
        return { prayer: 'isha', start: new Date(isha.getTime() - day), end: fajr };
    if (now < dhuhr)
        return { prayer: 'fajr', start: fajr, end: dhuhr };
    if (now < asr)
        return { prayer: 'dhuhr', start: dhuhr, end: asr };
    if (now < maghrib)
        return { prayer: 'asr', start: asr, end: maghrib };
    if (now < isha)
        return { prayer: 'maghrib', start: maghrib, end: isha };
    return { prayer: 'isha', start: isha, end: new Date(fajr.getTime() + day) };
}
/** Dawn progress for the Fajr scene: 0 at Fajr, 1 about 20 minutes after sunrise. */
export function dawnProgress(now = new Date()) {
    if (forcedDawn !== null)
        return Math.min(1, Math.max(0, Number(forcedDawn)));
    const fajr = at('fajr'), sunrise = at('sunrise');
    if (!fajr || !sunrise)
        return forcedPrayer === 'fajr' ? 0.55 : 1;
    const end = sunrise.getTime() + 20 * 60_000;
    return Math.min(1, Math.max(0, (now.getTime() - fajr.getTime()) / (end - fajr.getTime())));
}
