// Generated from rpi-dashboard/apps/web/src/scene/backgrounds/frames.ts by tools/sync-dashboard.mjs. Edit it there.
import { mix } from '../../lib/color.js';
/** Plays imported frames (e.g. from a GIF), stretched to fill the screen. */
export function frames(ctx, asset) {
    return asset.palette ? pixelFrames(ctx, asset) : asciiFrames(ctx, asset);
}
function pixelFrames(ctx, asset) {
    const ids = {};
    for (const [k, hex] of Object.entries(asset.palette))
        ids[k] = ctx.palette.id(hex);
    const fps = asset.fps ?? 10;
    const data = asset.frames.map((rows) => {
        const h = rows.length;
        const w = Math.max(...rows.map((r) => r.length));
        const px = new Uint16Array(w * h);
        rows.forEach((row, y) => Array.from(row).forEach((ch, x) => (px[y * w + x] = ids[ch] ?? 0)));
        return { w, h, px };
    });
    return {
        draw(_grid, t, layer) {
            const f = data[Math.floor(Math.max(0, t) * fps) % data.length];
            for (let y = 0; y < layer.h; y++) {
                const sy = Math.floor((y * f.h) / layer.h);
                for (let x = 0; x < layer.w; x++)
                    layer.set(x, y, f.px[sy * f.w + Math.floor((x * f.w) / layer.w)]);
            }
        },
    };
}
function asciiFrames(ctx, asset) {
    const { glyphs, palette, theme } = ctx;
    const ramp = Array.from(asset.ramp ?? theme.ramp);
    const fps = asset.fps ?? 10;
    const shades = [0.2, 0.35, 0.5, 0.65, 0.8, 1].map((k) => palette.id(mix(theme.background, theme.accent, k)));
    // Pre-convert every frame to glyph + color ids.
    const data = asset.frames.map((rows) => {
        const h = rows.length;
        const w = Math.max(...rows.map((r) => Array.from(r).length));
        const g = new Uint8Array(w * h);
        const c = new Uint16Array(w * h);
        rows.forEach((row, y) => Array.from(row).forEach((ch, x) => {
            if (ch === ' ')
                return;
            const level = Math.max(0, ramp.indexOf(ch)) / Math.max(1, ramp.length - 1);
            g[y * w + x] = glyphs.id(ch);
            c[y * w + x] = shades[Math.min(shades.length - 1, Math.floor(level * shades.length))];
        }));
        return { w, h, g, c };
    });
    return {
        draw(grid, t) {
            const f = data[Math.floor(Math.max(0, t) * fps) % data.length];
            for (let y = 0; y < grid.rows; y++) {
                const sy = Math.floor((y * f.h) / grid.rows);
                for (let x = 0; x < grid.cols; x++) {
                    const i = sy * f.w + Math.floor((x * f.w) / grid.cols);
                    if (f.g[i])
                        grid.set(x, y, f.g[i], f.c[i]);
                }
            }
        },
    };
}
