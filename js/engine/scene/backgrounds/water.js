// Generated from rpi-dashboard/apps/web/src/scene/backgrounds/water.ts by tools/sync-dashboard.mjs. Edit it there.
import { mix } from '../../lib/color.js';
import { hash } from '../pixels.js';
/** Night sky with twinkling stars over rolling water, with perspective toward the horizon. */
export function water(ctx, params = {}) {
    const { glyphs, palette, theme } = ctx;
    const speed = params.speed ?? 1;
    const horizon = params.horizon ?? 0.62;
    const starDensity = params.stars ?? 0.018;
    const waterIds = glyphs.split(params.ramp ?? ' .-~=≈');
    const starIds = glyphs.split(params.starRamp ?? '.·+*');
    const trailIds = glyphs.split('-=≡*');
    const waterShades = [0.18, 0.3, 0.45, 0.6, 0.78, 1].map((k) => palette.id(mix(theme.background, theme.accent, k)));
    const starShades = [0.25, 0.45, 0.7, 1].map((k) => palette.id(mix(theme.background, theme.foreground, k)));
    const horizonShade = palette.id(mix(theme.background, theme.muted, 0.8));
    const horizonGlyph = glyphs.id('─');
    return {
        horizon,
        draw(grid, t) {
            const { cols, rows } = grid;
            const h = Math.round(rows * horizon);
            const ts = t * speed;
            // Sky
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < cols; x++) {
                    const r = hash(x, y);
                    if (r >= starDensity)
                        continue;
                    const r2 = hash(y, x);
                    const tw = 0.5 + 0.5 * Math.sin(ts * (0.6 + r2 * 2.2) + r2 * 40);
                    const k = Math.min(3, Math.floor(tw * 4));
                    grid.set(x, y, starIds[Math.min(starIds.length - 1, Math.floor(tw * starIds.length))], starShades[k]);
                }
            }
            // Shooting star: one every ~23s, lasting ~1.4s, moving down-left
            if (params.shootingStars !== false) {
                const period = 23;
                const cycle = Math.floor(ts / period);
                const phase = ts - cycle * period;
                if (phase < 1.4) {
                    const sx = Math.floor(cols * (0.35 + 0.6 * hash(cycle, 7)));
                    const sy = Math.floor(h * 0.35 * hash(3, cycle));
                    const p = phase / 1.4;
                    const hx = sx - Math.floor(p * cols * 0.25);
                    const hy = sy + Math.floor(p * h * 0.25);
                    for (let i = 0; i < 8; i++) {
                        const k = Math.max(0, 3 - Math.floor(i / 2)); // head bright → tail dim
                        grid.set(hx + i * 2, hy - Math.floor(i / 2), trailIds[k], starShades[k]);
                    }
                }
            }
            // Horizon line
            for (let x = 0; x < cols; x++)
                grid.set(x, h, horizonGlyph, horizonShade);
            // Water
            const depthRows = Math.max(1, rows - h - 1);
            for (let y = h + 1; y < rows; y++) {
                const d = (y - h) / depthRows; // 0 at horizon → 1 at bottom (closest to viewer)
                const persp = 0.25 + d;
                for (let x = 0; x < cols; x++) {
                    const v = 0.5 +
                        0.5 *
                            (0.55 * Math.sin((x * 0.09) / persp + ts * 1.2 + y * 0.7) +
                                0.3 * Math.sin((x * 0.23) / persp - ts * 0.8 + y * 1.3) +
                                0.15 * Math.sin(x * 0.05 - y * 0.4 + ts * 0.5));
                    const gi = Math.min(waterIds.length - 1, Math.floor(v * v * waterIds.length));
                    if (gi === 0)
                        continue;
                    const ci = Math.min(waterShades.length - 1, Math.floor((v * 0.55 + d * 0.45) * waterShades.length));
                    grid.set(x, y, waterIds[gi], waterShades[ci]);
                }
            }
        },
    };
}
