// Generated from rpi-dashboard/apps/web/src/scene/backgrounds/meadow.ts by tools/sync-dashboard.mjs. Edit it there.
import { bayer, hash } from '../pixels.js';
const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
/**
 * A Kazakh mountain meadow in spring (Tian Shan foothills): blue sky and clouds, snow-capped
 * peaks, dark spruce-covered slopes, green hills with bushes, a winding dirt path and a meadow
 * full of dandelions; seeds drift up in the sunshine.
 */
export function meadow(ctx, params = {}) {
    const C = Object.fromEntries(Object.entries({
        cloud: '#ffffff', cloudMid: '#eef4fb', cloudShade: '#cfdced',
        peak: '#9fb1c8', peakShade: '#8497b0', snow: '#f4f7fb', snowShade: '#d6e0ec',
        forest1: '#1f3f2c', forest2: '#2c5238', forest3: '#3d6a44', forestLit: '#5a8a4e', haze: '#6e8f86',
        hill1: '#5f9a42', hill2: '#76b04c', hill3: '#8fc25a', bush: '#3f7a34', bushLit: '#5c9a40',
        path: '#b8a07a', pathShade: '#9a845e', pathLit: '#d0bc96',
        grass1: '#5a8f34', grass2: '#6fa33f', grass3: '#86b84a', grass4: '#9ccb58', blade: '#4a7e2c',
        puff: '#f6f6f0', puffShade: '#d8dcd0', yellow: '#f2d23a', stem: '#6a9a3a',
    }).map(([k, v]) => [k, ctx.palette.id(v)]));
    const sky = ['#3f7fd0', '#4c8ad6', '#5c97db', '#6ea5e0', '#84b5e6', '#9cc6ec', '#b6d6f1'].map((c) => ctx.palette.id(c));
    const seedGlyphs = ['·', '˙', '∙'].map((g) => ctx.glyphs.id(g));
    const seedColor = ctx.palette.id('#fbfbf6');
    let base = new Uint16Array(0);
    let isSky = new Uint8Array(0);
    let w = 0, h = 0, s = 1;
    function build() {
        base = new Uint16Array(w * h);
        isSky = new Uint8Array(w * h);
        const put = (x, y, c) => {
            x = Math.round(x);
            y = Math.round(y);
            if (x >= 0 && y >= 0 && x < w && y < h) {
                base[y * w + x] = c;
                isSky[y * w + x] = 0;
            }
        };
        // Sky
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                const f = Math.min(0.999, y / (h * 0.5)) * (sky.length - 1);
                const i = Math.floor(f);
                base[y * w + x] = f - i > bayer(x, y) ? sky[Math.min(sky.length - 1, i + 1)] : sky[i];
                isSky[y * w + x] = 1;
            }
        // Layered landscape, far to near: [ridge height function, fill]
        const ridge = (x, base0, amp, freq, seed) => Math.round(h * base0 - amp * s * (noise(x * freq + seed, seed) * 0.7 + noise(x * freq * 2.3 + seed, seed + 3) * 0.3));
        // Snow-capped peaks
        for (let x = 0; x < w; x++) {
            const top = ridge(x, 0.34, 26, 0.035, 11);
            for (let y = top; y < h * 0.5; y++) {
                const depth = y - top;
                const slope = ridge(x + 4, 0.34, 26, 0.035, 11) - ridge(x - 4, 0.34, 26, 0.035, 11); // > 0: falls away to the right (shadow side)
                put(x, y, depth < 4 * s + noise(x * 0.3, 2) * 4 ? (slope > 1 || hash(x >> 1, y) < 0.1 ? C.snowShade : C.snow) : slope > 1 ? C.peakShade : C.peak);
            }
        }
        // Spruce-covered mountain slopes: dark, textured with little tree points
        for (let x = 0; x < w; x++) {
            const top = ridge(x, 0.44, 22, 0.022, 31);
            for (let y = top; y < h * 0.62; y++) {
                const n = hash(x, y);
                const tree = (x + (y >> 1) * 3) % 5 === 0 && n < 0.6;
                const d = (y - top) / (h * 0.2);
                put(x, y, y === top ? C.haze : tree ? C.forest1 : n < 0.2 ? C.forestLit : d > 0.6 ? C.forest3 : n < 0.55 ? C.forest2 : C.forest1);
            }
        }
        // Green hills with bushes
        for (let x = 0; x < w; x++) {
            const top = ridge(x, 0.58, 12, 0.03, 57);
            for (let y = top; y < h * 0.72; y++) {
                const b = noise(x * 0.12, y * 0.2) > 0.68;
                put(x, y, b ? (hash(x, y) < 0.3 ? C.bushLit : C.bush) : y < top + 3 ? C.hill3 : bayer(x, y) < 0.4 ? C.hill1 : C.hill2);
            }
        }
        // Meadow in front
        const meadowTop = Math.round(h * 0.66);
        for (let y = meadowTop; y < h; y++)
            for (let x = 0; x < w; x++) {
                const d = (y - meadowTop) / (h - meadowTop);
                const n = noise(x * 0.08, y * 0.15);
                let k = n > 0.7 ? C.grass4 : n > 0.5 ? C.grass3 : n > 0.3 ? C.grass2 : C.grass1;
                if (hash(x, y) < 0.12 + d * 0.1)
                    k = C.blade;
                put(x, y, k);
            }
        // Winding dirt path from the right foreground back into the hills
        for (let y = Math.round(h * 0.6); y < h; y++) {
            const t = (y - h * 0.6) / (h * 0.4);
            const cx = w * (0.86 - 0.12 * Math.sin(t * 2.2) - 0.05 * t);
            const hw = (1 + t * 7) * s;
            for (let x = Math.round(cx - hw); x <= cx + hw; x++) {
                const edge = Math.abs(x - cx) > hw - 1;
                put(x, y, edge ? C.pathShade : Math.abs(x - cx) < hw * 0.25 && t > 0.3 ? C.grass3 : hash(x, y) < 0.2 ? C.pathLit : C.path);
            }
        }
        // Dandelions: white seed puffs and yellow flowers, denser and bigger near the viewer
        for (let i = 0; i < 260 * (w / 192); i++) {
            const x = Math.floor(hash(i, 1) * w);
            const t = Math.pow(hash(i, 2), 0.7);
            const y = Math.floor(meadowTop + 4 + t * (h - meadowTop - 4));
            if (base[y * w + x] === C.path)
                continue;
            const big = t > 0.6;
            put(x, y + 1, C.stem);
            if (hash(i, 3) < 0.72) {
                put(x, y, C.puff);
                if (big) {
                    put(x - 1, y, C.puffShade);
                    put(x + 1, y, C.puff);
                    put(x, y - 1, C.puff);
                }
            }
            else
                put(x, y, C.yellow);
        }
    }
    const clouds = Array.from({ length: 5 }, (_, i) => ({
        x: hash(i, 71), y: 0.05 + hash(i, 72) * 0.2, len: 22 + hash(i, 73) * 30, speed: 0.4 + hash(i, 74) * 0.6,
    }));
    const seeds = Array.from({ length: params.seeds ?? 16 }, (_, i) => ({
        x: hash(i, 81), phase: hash(i, 82), speed: 0.3 + hash(i, 83) * 0.4, g: i % 3,
    }));
    return {
        draw(_grid, t, px) {
            if (px.w !== w || px.h !== h) {
                w = px.w;
                h = px.h;
                s = h / 120;
                build();
            }
            px.data.set(base);
            const wind = params.wind ?? 1;
            // Puffy clouds drifting behind the peaks
            for (const c of clouds) {
                const span = w + c.len * 2;
                const x0 = ((c.x * span + t * c.speed * wind) % span) - c.len;
                const y0 = c.y * h;
                for (let dy = -4; dy <= 3; dy++)
                    for (let dx = 0; dx < c.len; dx++) {
                        const nx = (dx / c.len) * 2 - 1;
                        const puff = 1 - nx * nx - (dy / 4) ** 2 + 0.3 * Math.sin(dx * 0.5 + c.len);
                        if (puff <= 0.05)
                            continue;
                        const X = Math.round(x0 + dx), Y = Math.round(y0 + dy);
                        if (X < 0 || Y < 0 || X >= w || Y >= h || !isSky[Y * w + X])
                            continue;
                        px.set(X, Y, dy > 1 ? C.cloudShade : puff > 0.45 ? C.cloud : C.cloudMid);
                    }
            }
            // Grass tips sway
            for (let i = 0; i < 60; i++) {
                const x = Math.floor(hash(i, 91) * w), y = Math.floor(h * (0.7 + hash(i, 92) * 0.28));
                px.set(x + (Math.sin(t * 1.5 + i) > 0 ? 1 : 0), y, C.blade);
            }
        },
        // Dandelion seeds drifting up through the sunlight
        overlay(grid, t) {
            for (const sd of seeds) {
                const life = (sd.phase + t * 0.02 * sd.speed) % 1;
                const y = Math.floor((1 - life) * grid.rows);
                const x = Math.floor(sd.x * grid.cols + Math.sin(t * 0.7 + sd.phase * 9) * 3 + life * 6);
                grid.set(x, y, seedGlyphs[sd.g], seedColor);
            }
        },
    };
}
