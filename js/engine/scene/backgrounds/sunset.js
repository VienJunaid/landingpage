// Generated from rpi-dashboard/apps/web/src/scene/backgrounds/sunset.ts by tools/sync-dashboard.mjs. Edit it there.
import { mix } from '../../lib/color.js';
import { dawnProgress } from '../../lib/prayerClock.js';
import { bayer, hash } from '../pixels.js';
// Dawn palettes: [pre-dawn, sun up]; colors are blended by dawn progress in 8 steps.
const DAWN_SKY = [
    ['#0b1030', '#13173d', '#1d1f4d', '#2b2759', '#3f2f63', '#5a3a6c', '#7a4670', '#9a5572', '#b86a74', '#d08678'],
    ['#3a5fa8', '#5577b8', '#7390c4', '#93a8cc', '#b5bccd', '#d6c3c0', '#efc7a8', '#f8cf95', '#fdd98a', '#ffe6a8'],
];
const DAWN_GROUND = [
    ['#3b2a40', '#4a3448', '#5a3e4e', '#6a4a54', '#7a565a', '#8a6262'],
    ['#b57d6a', '#c68d72', '#d29c7c', '#dcab86', '#e4b990', '#ecc69c'],
];
const DAWN_COLORS = {
    farHill: ['#3a2c55', '#a893b0'], midHill: ['#2c2248', '#8c7598'], city: ['#211a3a', '#6a5578'],
    tileLine: ['#2f2436', '#9a6f66'], tileLineNear: ['#4a3440', '#c2877a'],
    cloudTop: ['#2c2350', '#b8a6c8'], cloudMid: ['#4a3462', '#f0b8b0'], cloudLit: ['#8a5a7a', '#ffd0a8'], cloudBright: ['#b07a86', '#fff0cc'],
};
const SKY = ['#1a1438', '#2a1b52', '#43246b', '#6a2f7e', '#9a3d86', '#c94f7f', '#ec6f6a', '#f7955c', '#fbbd66', '#ffe08f'];
const GROUND = ['#6e3f62', '#8c5268', '#a9666c', '#c07a70', '#d29076', '#e0a682'];
/** Pixel-art sunset over Jerusalem: dithered sky, sun glow, hills, skyline and a stone plaza. */
export function sunset(ctx, params = {}) {
    const { palette, glyphs } = ctx;
    const speed = params.speed ?? 1;
    const horizon = params.horizon ?? 0.64;
    let sky = (params.sky ?? SKY).map((c) => palette.id(c));
    let ground = (params.ground ?? GROUND).map((c) => palette.id(c));
    const C = Object.fromEntries(Object.entries({
        sun: '#fff6d6', sunEdge: '#ffd98a', farHill: '#8a4a7e', midHill: '#6c3572', city: '#4f2662',
        window: '#ffcf6e', tileLine: '#7d4760', tileLineNear: '#b0705f', sheen: '#f0b98c',
        cloudTop: '#7d4488', cloudMid: '#c65f84', cloudLit: '#f59a7a', cloudBright: '#ffc58e',
        bird: '#2b1838', star: '#e8d9ff', starDim: '#8f7cc0', mote: '#ffe2a8',
    }).map(([k, v]) => [k, palette.id(v)]));
    const moteGlyphs = [glyphs.id('·'), glyphs.id('∙'), glyphs.id('˙')];
    // Dawn: blend the palettes for the current step (0–8)
    let level = -1, dawnP = 1;
    function setDawnLevel(l) {
        level = l;
        dawnP = l / 8;
        sky = DAWN_SKY[0].map((c, i) => palette.id(mix(c, DAWN_SKY[1][i], dawnP)));
        ground = DAWN_GROUND[0].map((c, i) => palette.id(mix(c, DAWN_GROUND[1][i], dawnP)));
        for (const [k, [a, b]] of Object.entries(DAWN_COLORS))
            C[k] = palette.id(mix(a, b, dawnP));
    }
    let base = new Uint16Array(0);
    let w = 0, h = 0, hz = 0, sx = 0, sy = 0;
    const dither = (stops, t, x, y) => {
        const f = Math.min(0.999, Math.max(0, t)) * (stops.length - 1);
        const i = Math.floor(f);
        return f - i > bayer(x, y) ? stops[Math.min(stops.length - 1, i + 1)] : stops[i];
    };
    function buildBase() {
        base = new Uint16Array(w * h);
        const put = (x, y, c) => {
            if (x >= 0 && y >= 0 && x < w && y < h)
                base[y * w + x] = c;
        };
        const s = h / 120; // scale features to screen size
        const glowR = w * 0.38;
        // Sky with a warm halo around the sun
        for (let y = 0; y < hz; y++)
            for (let x = 0; x < w; x++) {
                const d = Math.hypot(x - sx, (y - sy) * 1.3);
                const g = Math.max(0, 1 - d / glowR);
                put(x, y, dither(sky, y / hz + g * g * 0.5, x, y));
            }
        // Sun disk (partly sunk behind the hills)
        const r = Math.max(4, Math.round(7 * s));
        for (let y = sy - r - 2; y <= sy + r + 2; y++)
            for (let x = sx - r - 2; x <= sx + r + 2; x++) {
                const d = Math.hypot(x - sx, y - sy);
                if (d <= r - 0.5)
                    put(x, y, C.sun);
                else if (d <= r + 0.7)
                    put(x, y, C.sunEdge);
            }
        // Hills: far (hazy) then nearer
        for (let x = 0; x < w; x++) {
            const far = hz - Math.round(s * (7 + 4 * Math.sin(x * 0.03 + 1) + 2.5 * Math.sin(x * 0.083 + 2) + 1.2 * Math.sin(x * 0.21)));
            for (let y = far; y < hz; y++)
                put(x, y, C.farHill);
            const mid = hz - Math.round(s * (3 + 2 * Math.sin(x * 0.05 + 4) + 1.5 * Math.sin(x * 0.13)));
            for (let y = mid; y < hz; y++)
                put(x, y, C.midHill);
        }
        // Old City skyline silhouette: houses, little domes, minarets, lit windows
        if (params.skyline !== false) {
            let x = 0;
            while (x < w) {
                const bw = 3 + Math.floor(hash(x, 1) * 6);
                const bh = Math.round((2 + hash(x, 2) * 6) * s);
                for (let yy = hz - bh; yy < hz; yy++)
                    for (let xx = x; xx < x + bw; xx++)
                        put(xx, yy, C.city);
                if (hash(x, 3) < 0.4) {
                    // Small domes over the rooftops
                    const rr = Math.max(1, Math.floor(bw / 2));
                    const cx = x + (bw - 1) / 2;
                    for (let yy = 0; yy <= rr; yy++)
                        for (let xx = Math.ceil(cx - rr); xx <= cx + rr; xx++)
                            if (Math.hypot(xx - cx, yy) <= rr + 0.3)
                                put(xx, hz - bh - yy, C.city);
                    put(Math.round(cx), hz - bh - rr - 1, C.city);
                }
                for (let yy = hz - bh + 1; yy < hz - 1; yy++)
                    for (let xx = x; xx < x + bw; xx++)
                        if (hash(xx, yy) < 0.05 * (params.dawn ? 1 - dawnP : 1))
                            put(xx, yy, C.window);
                x += bw + (hash(x, 6) < 0.3 ? 1 : 0);
            }
        }
        // Plaza: warm stone, perspective joints toward a vanishing point, sunlit sheen
        const vx = w * 0.5;
        for (let y = hz; y < h; y++) {
            const t = (y - hz) / Math.max(1, h - hz);
            for (let x = 0; x < w; x++) {
                const sheen = Math.max(0, 1 - Math.abs(x - sx) / (w * 0.25)) * (1 - t) * 0.35;
                put(x, y, dither(ground, t + sheen, x, y));
            }
        }
        for (let k = 1; k <= 8; k++) {
            const y = hz + Math.round((h - hz) * Math.pow(k / 8, 1.7));
            const c = k > 4 ? C.tileLineNear : C.tileLine;
            for (let x = 0; x < w; x++)
                if (y < h)
                    put(x, y, c);
        }
        for (const m of [0.5, 1.3, 2.3, 3.6, 5.2, 7.5, 11]) {
            for (let y = hz + 1; y < h; y++) {
                const t = (y - hz) / Math.max(1, h - hz);
                const c = t > 0.45 ? C.tileLineNear : C.tileLine;
                put(Math.round(vx + (y - hz) * m), y, c);
                put(Math.round(vx - (y - hz) * m), y, c);
            }
        }
    }
    const clouds = Array.from({ length: params.clouds ?? 6 }, (_, i) => ({
        y: 0.12 + 0.55 * hash(i, 11),
        len: 16 + Math.floor(hash(i, 12) * 26),
        speed: 0.4 + hash(i, 13) * 0.8,
        offset: hash(i, 14),
    }));
    const birds = Array.from({ length: params.birds ?? 5 }, (_, i) => ({
        y: 0.25 + 0.25 * hash(i, 21),
        speed: 3 + hash(i, 22) * 2,
        offset: hash(i, 23),
        phase: hash(i, 24) * 6,
    }));
    const motes = Array.from({ length: params.motes ?? 14 }, (_, i) => ({
        x: hash(i, 31), y: hash(i, 32), speed: 0.3 + hash(i, 33), phase: hash(i, 34) * 6, g: i % 3,
    }));
    return {
        horizon,
        draw(_grid, t, px) {
            const dawnLevel = params.dawn ? Math.round(dawnProgress() * 8) : -1;
            if (px.w !== w || px.h !== h || dawnLevel !== level) {
                if (params.dawn && dawnLevel !== level)
                    setDawnLevel(dawnLevel);
                w = px.w;
                h = px.h;
                hz = Math.round(h * horizon);
                sx = Math.round(w * (params.sunX ?? 0.24));
                // At dawn the sun starts below the hills and climbs as the morning comes
                sy = Math.round(h * (params.dawn ? 0.74 - 0.22 * dawnP : (params.sunY ?? 0.6)));
                buildBase();
            }
            px.data.set(base);
            const ts = t * speed;
            // Faint first stars in the darkest part of the sky
            const stars = params.dawn ? Math.round(90 * (1 - dawnP)) + 5 : 40;
            for (let i = 0; i < stars; i++) {
                const x = Math.floor(hash(i, 41) * w), y = Math.floor(hash(i, 42) * hz * (params.dawn ? 0.2 + 0.5 * (1 - dawnP) : 0.28));
                const tw = Math.sin(ts * (0.7 + hash(i, 43)) + i);
                if (tw > 0.2)
                    px.set(x, y, tw > 0.8 ? C.star : C.starDim);
            }
            // Long thin clouds drifting right, lit from below by the sun
            for (const c of clouds) {
                const span = w + c.len * 2;
                const x0 = Math.floor(((c.offset * span + ts * c.speed * 1.5) % span) - c.len);
                const y0 = Math.floor(c.y * hz);
                const warmth = Math.max(0, 1 - Math.abs(x0 + c.len / 2 - sx) / (w * 0.5));
                const rows = [
                    [0.25, 0.55, C.cloudTop],
                    [0, 1, warmth > 0.5 ? C.cloudLit : C.cloudMid],
                    [0.15, 0.75, warmth > 0.4 ? C.cloudBright : C.cloudLit],
                ];
                rows.forEach(([a, b, col], r) => {
                    for (let x = Math.floor(x0 + c.len * a); x < x0 + c.len * b; x++)
                        px.set(x, y0 + r, col);
                });
            }
            // Birds flapping across, right → left
            for (const b of birds) {
                const x = Math.floor(w - ((b.offset * (w + 30) + ts * b.speed) % (w + 30)) + 10);
                const y = Math.floor(b.y * hz + Math.sin(ts * 0.8 + b.phase) * 2);
                const up = Math.floor(ts * 5 + b.phase) % 2 === 0;
                px.set(x, y, C.bird);
                px.set(x - 1, up ? y - 1 : y + 1, C.bird);
                px.set(x + 1, up ? y - 1 : y + 1, C.bird);
            }
        },
        // ASCII dust motes drifting up through the warm light (drawn over the pixel art)
        overlay(grid, t) {
            for (const m of motes) {
                const y = Math.floor((((m.y - t * 0.012 * m.speed) % 1) + 1) % 1 * grid.rows);
                const x = Math.floor(m.x * grid.cols + Math.sin(t * 0.5 + m.phase) * 2);
                if (Math.sin(t * 1.3 + m.phase) > -0.2)
                    grid.set(x, y, moteGlyphs[m.g], C.mote);
            }
        },
    };
}
