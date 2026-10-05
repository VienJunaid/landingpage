// Generated from rpi-dashboard/apps/web/src/lib/timeFormat.ts by tools/sync-dashboard.mjs. Edit it there.
/**
 * 12- or 24-hour time for everything on screen: the clock, Salah times, the prayer banner, calendar
 * events and the sleep screen. Set once from dashboard.json (the clock widget's `hour12` option,
 * toggled in Settings); changing it reloads the page, so this doesn't need to be reactive.
 */
let hour12 = true;
const cache = new Map();
export function setHour12(on) {
    hour12 = on;
    cache.clear();
}
export const is12h = () => hour12;
/** "4:52 PM" or "16:52". */
export function formatTime(date, timeZone) {
    const key = timeZone ?? '';
    let fmt = cache.get(key);
    if (!fmt) {
        // hourCycle h23 rather than hour12: false, which some browsers render as "24:05" after midnight
        fmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone, ...(hour12 ? { hour12: true } : { hourCycle: 'h23' }) });
        cache.set(key, fmt);
    }
    return fmt.format(date);
}
