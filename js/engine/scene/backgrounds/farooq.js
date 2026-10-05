// Generated from rpi-dashboard/apps/web/src/scene/backgrounds/farooq.ts by tools/sync-dashboard.mjs. Edit it there.
import { bayer, hash } from '../pixels.js';
const A = 1.11; // pixel width ÷ height
const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
/**
 * The pointed arch at Masjid Al-Farooq, Atlanta: white marble border, a diamond mosaic of
 * stone tiles, an inner arch framing a marble panel, cream brick base and benches, trees on the
 * right under an overcast sky.
 */
export function farooq(ctx, params = {}) {
    const C = Object.fromEntries(Object.entries({
        sky1: '#b4bcc8', sky2: '#c6ccd5', sky3: '#d7dbe1', cloud: '#e6e8ec',
        leaf1: '#233a25', leaf2: '#35532f', leaf3: '#4d6d3c', leaf4: '#6c8a4a', leafRust: '#8a4f2a',
        brick: '#e7e0d1', brickShade: '#d6cebd', mortar: '#bfb5a3', slab: '#dcd6ca', slabEdge: '#b3aa9a',
        redBrick: '#a4583f', redMortar: '#7d4232',
        ground: '#9b8b7c', groundLine: '#7d6e61', groundLit: '#ab9c8d',
        marbleW: '#f1ece2', marbleW2: '#e1dacc', marbleWShade: '#c6bcab', vein: '#d2c9b8',
        grout: '#ebe4d6', groutDot: '#2e2622',
        t1: '#c8a47e', t2: '#dccab0', t3: '#9d6b4a', t4: '#b3713f', t5: '#b9ab98', t6: '#cf9a6a',
        panel1: '#a38c74', panel2: '#8e785f', panel3: '#b9a387', panel4: '#7a654f', rail: '#1f1b1a',
    }).map(([k, v]) => [k, ctx.palette.id(v)]));
    const petalGlyphs = ['·', '•', '˙', '°'].map((g) => ctx.glyphs.id(g));
    const petalColors = ['#f6c945', '#f07a3a', '#f4f0ea', '#e2b35a'].map((c) => ctx.palette.id(c));
    let base = new Uint16Array(0);
    let isSky = new Uint8Array(0);
    let w = 0, h = 0;
    /** Half-width (px) of a pointed arch at row y: rounded shoulders narrowing to a point. */
    const archHW = (y, spring, apex, W) => {
        if (y >= spring)
            return W;
        const t = (spring - y) / (spring - apex);
        return t >= 1 ? -1 : W * Math.pow(1 - t * t, 1.1);
    };
    function build() {
        base = new Uint16Array(w * h);
        isSky = new Uint8Array(w * h);
        const s = h / 120;
        const cx = Math.round(w / 2);
        const put = (x, y, c) => {
            if (x >= 0 && y >= 0 && x < w && y < h) {
                base[y * w + x] = c;
                isSky[y * w + x] = 0;
            }
        };
        const baseTop = Math.round(h * 0.6), benchTop = Math.round(h * 0.62), groundTop = Math.round(h * 0.8);
        // Overcast sky
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                // Soft overcast: smooth noise stretched sideways, lighter toward the horizon
                const n = noise(x * 0.035, y * 0.09) * 0.65 + noise(x * 0.09, y * 0.2) * 0.2 + (y / h) * 0.45;
                const d = (bayer(x, y) - 0.5) * 0.12;
                base[y * w + x] = n + d > 0.78 ? C.cloud : n + d > 0.62 ? C.sky3 : n + d > 0.45 ? C.sky2 : C.sky1;
                isSky[y * w + x] = 1;
            }
        // Trees on the right (and a little on the left)
        for (let y = Math.round(h * 0.28); y < benchTop; y++)
            for (let x = 0; x < w; x++) {
                const right = (x - w * 0.84) / (w * 0.16);
                const left = (w * 0.1 - x) / (w * 0.1);
                const edge = Math.max(right, left * 0.6);
                const n = hash(Math.floor(x / 2), Math.floor(y / 2)) * 0.5 + hash(Math.floor(x / 5), Math.floor(y / 4)) * 0.5;
                if (edge + n * 0.6 - (1 - (y - h * 0.28) / (h * 0.34)) * 0.35 < 0.55)
                    continue;
                const k = n + (x / w) * 0.2;
                put(x, y, hash(x, y) < 0.04 ? C.leafRust : k > 0.8 ? C.leaf4 : k > 0.6 ? C.leaf3 : k > 0.4 ? C.leaf2 : C.leaf1);
            }
        // Cream brick base with bench slabs, a red brick planter on the right
        const brickRow = Math.max(2, Math.round(3 * s)), brickW = Math.max(4, Math.round(7 * s));
        for (let y = baseTop; y < groundTop; y++)
            for (let x = Math.round(cx - 78 * s); x <= cx + 78 * s; x++) {
                const row = Math.floor((y - baseTop) / brickRow);
                const off = row % 2 ? Math.floor(brickW / 2) : 0;
                let k = (y - baseTop) % brickRow === 0 || (x + off) % brickW === 0 ? C.mortar : x > cx + 40 * s ? C.brickShade : C.brick;
                if (Math.abs(y - benchTop) <= 0)
                    k = C.slab;
                if (y === benchTop + 1)
                    k = C.slabEdge;
                put(x, y, k);
            }
        for (let y = Math.round(h * 0.66); y < groundTop; y++)
            for (let x = Math.round(cx + 79 * s); x < w; x++)
                put(x, y, (y - Math.round(h * 0.66)) % brickRow === 0 || (x + (Math.floor(y / brickRow) % 2) * 3) % brickW === 0 ? C.redMortar : C.redBrick);
        // Ground: stone deck
        for (let y = groundTop; y < h; y++)
            for (let x = 0; x < w; x++) {
                const row = Math.floor((y - groundTop) / Math.max(2, Math.round(4 * s)));
                const joint = (x + row * 11) % Math.round(24 * s) === 0;
                put(x, y, (y - groundTop) % Math.max(2, Math.round(4 * s)) === 0 || joint ? C.groundLine : bayer(x, y) < 0.25 ? C.groundLit : C.ground);
            }
        // The arch
        const outerSpring = h * 0.5, outerApex = -h * 0.04, outerW = 58 * s;
        const border = 5 * s;
        const innerSpring = h * 0.56, innerApex = h * 0.2, innerW = 30 * s, innerBorder = 4 * s;
        const tiles = [C.t1, C.t2, C.t3, C.t4, C.t5, C.t6, C.t1, C.t2];
        const P = Math.max(6, Math.round(9 * s)); // big enough that pixel diamonds read as diamonds
        for (let y = 0; y < groundTop; y++) {
            const oHW = archHW(y, outerSpring, outerApex, outerW);
            if (oHW < 0)
                continue;
            for (let x = Math.round(cx - oHW); x <= cx + oHW; x++) {
                const dx = Math.abs(x - cx);
                // Distance from the outer edge (approx, in px) — decides border vs mosaic
                const inBorder = dx > oHW - border || y < outerApex + (outerSpring - outerApex) * 0.02 + border * 1.1 * (1 - dx / outerW);
                const iHW = archHW(y, innerSpring, innerApex, innerW + innerBorder);
                const iHW2 = archHW(y, innerSpring, innerApex, innerW);
                if (y >= baseTop && dx < oHW - border)
                    continue; // brick base shows between the pillars
                let k;
                if (inBorder && y < baseTop + 1) {
                    k = x > cx + oHW - border * 0.5 ? C.marbleWShade : hash(x, y) < 0.08 ? C.vein : C.marbleW;
                }
                else if (y >= baseTop) {
                    k = x > cx ? C.marbleWShade : C.marbleW; // pillars down to the ground
                }
                else if (iHW2 >= 0 && dx <= iHW2) {
                    // Marble panel with mottled veining, black rail across
                    const n = hash(Math.floor(x / 3), Math.floor(y / 2)) * 0.6 + hash(x, y) * 0.4;
                    k = n > 0.8 ? C.panel3 : n > 0.5 ? C.panel1 : n > 0.25 ? C.panel2 : C.panel4;
                    if (Math.abs(y - h * 0.37) < 0.6 && dx < innerW * 0.7)
                        k = C.rail;
                }
                else if (iHW >= 0 && dx <= iHW) {
                    k = dx > iHW - 1 || x > cx + iHW2 ? C.marbleWShade : hash(x, y) < 0.06 ? C.vein : C.marbleW2;
                }
                else {
                    // Diamond mosaic: lattice on (x+y) and (x−y), light grout with dark dots at crossings
                    const a = x - cx + y, b = x - cx - y;
                    const ga = ((a % P) + P) % P, gb = ((b % P) + P) % P;
                    if (ga === 0 && gb === 0)
                        k = C.groutDot;
                    else if (ga === 0 || gb === 0)
                        k = C.grout;
                    else {
                        const tile = tiles[Math.floor(hash(Math.floor(a / P), Math.floor(b / P)) * tiles.length)];
                        k = hash(x, y) < 0.1 ? C.vein : tile;
                    }
                }
                put(x, y, k);
            }
        }
    }
    const petals = Array.from({ length: params.petals ?? 18 }, (_, i) => ({
        x: hash(i, 81), speed: 0.35 + hash(i, 82) * 0.5, phase: hash(i, 83) * 6, g: i % 4, c: i % 4,
    }));
    return {
        draw(_grid, _t, px) {
            if (px.w !== w || px.h !== h) {
                w = px.w;
                h = px.h;
                build();
            }
            px.data.set(base);
        },
        // Petals drifting down in front of the couple
        overlay(grid, t) {
            for (const p of petals) {
                const y = Math.floor(((p.phase / 6 + t * 0.02 * p.speed) % 1) * grid.rows);
                const x = Math.floor(p.x * grid.cols + Math.sin(t * 0.8 + p.phase) * 3);
                grid.set(x, y, petalGlyphs[p.g], petalColors[p.c]);
            }
        },
    };
}
