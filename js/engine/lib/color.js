// Generated from rpi-dashboard/apps/web/src/lib/color.ts by tools/sync-dashboard.mjs. Edit it there.
export function hexToRgb(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3)
        h = [...h].map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbToHex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, t) => {
    const [x, y] = [hexToRgb(a), hexToRgb(b)];
    return rgbToHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t));
};
