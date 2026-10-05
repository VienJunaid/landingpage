// Generated from rpi-dashboard/apps/web/src/scene/backgrounds/sophia.ts by tools/sync-dashboard.mjs. Edit it there.
import { bayer, hash } from '../pixels.js';
/**
 * Hagia Sophia in the warm Asr light, seen through a dark gateway: the great lead dome with
 * its ring of windows, half-domes, rose-colored walls and buttresses, the big red arch, four
 * Ottoman minarets, palms, and people crossing the plaza.
 */
export function sophia(ctx, params = {}) {
    const C = Object.fromEntries(Object.entries({
        cloud: '#f2d2b8', cloudShade: '#caa2a4', cloudDark: '#a8889a',
        leadHi: '#b7c6d4', lead: '#8599ad', leadShade: '#627589', leadDark: '#4a5a6c',
        wall: '#e7a88e', wallLit: '#f4c2a4', wallShade: '#c58570', wallDark: '#9e6556',
        arch: '#c8604a', archDark: '#9c4636', win: '#3a2a2e', winLit: '#f6c878',
        minWhite: '#efe4d2', minWhiteShade: '#c9baa4', minBrick: '#c86a52', minBrickShade: '#9c4e3c', band: '#f3e6d0',
        gold: '#e6b85a',
        palmTrunk: '#6b4a36', palmTrunkDark: '#4e3426', frond: '#2f5a3a', frondLit: '#4a7a4a', frondDark: '#1f3e2a', bush: '#2a4a34', bushLit: '#3d6644',
        pave: '#9aa0ac', pave2: '#aab0ba', paveLine: '#7f8694', paveWarm: '#d6b9a4',
        frame: '#1b1411', frameBrick: '#261c17', frameEdge: '#6a4430', frameEdgeLit: '#9a6644',
        person: '#3a3440', personLight: '#7a6a70', pigeon: '#5a5a66',
    }).map(([k, v]) => [k, ctx.palette.id(v)]));
    const sky = ['#8ea8cc', '#a3b3cf', '#bdbccb', '#d6c1c0', '#ebc8b0', '#f6d3a6', '#fbdfae'].map((c) => ctx.palette.id(c));
    let base = new Uint16Array(0);
    let isFrame = new Uint8Array(0);
    let w = 0, h = 0, s = 1, cx = 0;
    function build() {
        base = new Uint16Array(w * h);
        isFrame = new Uint8Array(w * h);
        const put = (x, y, c) => {
            x = Math.round(x);
            y = Math.round(y);
            if (x >= 0 && y >= 0 && x < w && y < h)
                base[y * w + x] = c;
        };
        const rect = (x0, y0, x1, y1, c) => {
            for (let y = Math.round(y0); y <= Math.round(y1); y++)
                for (let x = Math.round(x0); x <= Math.round(x1); x++)
                    put(x, y, typeof c === 'number' ? c : c(x, y));
        };
        /** A dome of half-width r and height hgt resting on baseY, shaded from the left. */
        const dome = (dx, baseY, r, hgt, ribs = true) => {
            for (let y = 0; y <= hgt; y++) {
                const t = y / hgt;
                const hw = Math.round(r * Math.sqrt(Math.max(0, 1 - t * t)));
                for (let x = dx - hw; x <= dx + hw; x++) {
                    const u = (x - dx) / (hw + 0.5);
                    const light = 0.62 - u * 0.4 + t * 0.2 + (bayer(x, y) - 0.5) * 0.15;
                    let k = light > 0.85 ? C.leadHi : light > 0.55 ? C.lead : light > 0.3 ? C.leadShade : C.leadDark;
                    if (ribs && t < 0.85 && Math.abs(u) < 0.9 && Math.round(u * 9) !== Math.round(((x + 1 - dx) / (hw + 0.5)) * 9))
                        k = C.leadShade;
                    put(x, baseY - y, k);
                }
            }
        };
        const baseY = Math.round(h * 0.74);
        // Warm afternoon sky with soft streaky clouds
        for (let y = 0; y < baseY; y++)
            for (let x = 0; x < w; x++) {
                const f = Math.min(0.999, y / (h * 0.7)) * (sky.length - 1);
                const i = Math.floor(f);
                let k = f - i > bayer(x, y) ? sky[Math.min(sky.length - 1, i + 1)] : sky[i];
                const n = Math.sin(x * 0.045 + y * 0.35) * 0.5 + Math.sin(x * 0.11 - y * 0.2) * 0.3 + hash(x >> 2, y) * 0.3;
                if (y > h * 0.12 && y < h * 0.4 && n > 0.72)
                    k = n > 0.85 ? C.cloud : y > h * 0.3 ? C.cloudDark : C.cloudShade;
                put(x, y, k);
            }
        // Minarets: [x offset, top, white?]
        const minaret = (mx, top, white) => {
            const lit = white ? C.minWhite : C.minBrick, shade = white ? C.minWhiteShade : C.minBrickShade;
            put(mx, top - 2, C.gold);
            put(mx, top - 1, C.gold);
            for (let y = 0; y < Math.round(7 * s); y++) { // pointed lead cone
                const hw = Math.round((y / (7 * s)) * 2);
                for (let x = mx - hw; x <= mx + hw; x++)
                    put(x, top + y, x > mx ? C.leadShade : C.lead);
            }
            for (let y = Math.round(top + 7 * s); y <= baseY; y++) {
                const t = (y - top) / (baseY - top);
                const hw = t < 0.5 ? 1 : 2;
                for (let x = mx - hw; x <= mx + hw; x++)
                    put(x, y, x > mx ? shade : lit);
                if (!white && (y - top) % 6 === 0)
                    rect(mx - hw, y, mx + hw, y, C.band);
                if ([0.14, 0.42].some((b) => Math.abs(t - b) < 0.7 / (baseY - top)))
                    rect(mx - hw - 1, y, mx + hw + 1, y + 1, white ? C.minWhiteShade : C.band);
            }
        };
        minaret(Math.round(cx - 60 * s), Math.round(h * 0.07), true);
        minaret(Math.round(cx - 47 * s), Math.round(h * 0.17), true);
        minaret(Math.round(cx + 47 * s), Math.round(h * 0.15), false);
        minaret(Math.round(cx + 61 * s), Math.round(h * 0.09), false);
        // Rose-colored main mass and buttresses
        rect(cx - 36 * s, h * 0.38, cx + 36 * s, baseY, (x, y) => ((y - Math.round(h * 0.38)) % 7 === 0 ? C.wallShade : x > cx + 18 * s ? C.wallShade : C.wall));
        for (const bx of [-40, -32, 32, 40]) {
            const x0 = Math.round(cx + bx * s);
            rect(x0 - 3 * s, h * 0.34, x0 + 3 * s, baseY, (x, y) => (y < h * 0.34 + 3 * s ? C.wallDark : x < x0 ? C.wallLit : C.wallShade));
        }
        // Half-domes left and right, then the drum and the great dome
        dome(Math.round(cx - 24 * s), Math.round(h * 0.4), Math.round(15 * s), Math.round(7 * s));
        dome(Math.round(cx + 24 * s), Math.round(h * 0.4), Math.round(15 * s), Math.round(7 * s));
        rect(cx - 27 * s, h * 0.33, cx + 27 * s, h * 0.38, (x, y) => y === Math.round(h * 0.33) ? C.wallShade : (x - cx) % 3 === 0 && y > h * 0.335 && y < h * 0.375 ? C.win : x > cx + 12 * s ? C.wallShade : C.wall);
        dome(cx, Math.round(h * 0.33), Math.round(27 * s), Math.round(11 * s));
        put(cx, Math.round(h * 0.33 - 12 * s), C.gold);
        put(cx - 1, Math.round(h * 0.33 - 13 * s), C.gold);
        put(cx + 1, Math.round(h * 0.33 - 13 * s), C.gold);
        // The great red arch (tympanum) with its grid of windows
        const aTop = Math.round(h * 0.41), aBot = Math.round(h * 0.6), aHW = Math.round(13 * s);
        for (let y = aTop; y <= aBot; y++) {
            const t = (y - aTop) / (aBot - aTop);
            const hw = t < 0.35 ? Math.round(aHW * Math.sqrt(1 - ((0.35 - t) / 0.35) ** 2)) : aHW;
            for (let x = cx - hw; x <= cx + hw; x++) {
                let k = x > cx + hw - 2 ? C.archDark : C.arch;
                if (t > 0.2 && (x - cx + 30) % 3 === 0 && (y - aTop) % 3 === 1)
                    k = hash(x, y) < 0.2 ? C.winLit : C.win;
                put(x, y, k);
            }
        }
        // Lower domes and wings
        for (const [dx, r] of [[-50, 7], [-58, 5], [46, 7], [57, 6]]) {
            rect(cx + (dx - r) * s, h * 0.62, cx + (dx + r) * s, baseY, (x) => (x > cx + dx * s ? C.wallShade : C.wall));
            dome(Math.round(cx + dx * s), Math.round(h * 0.62), Math.round(r * s), Math.round(r * 0.6 * s), false);
        }
        // Arched doorways along the base
        for (let x = Math.round(cx - 34 * s); x <= cx + 34 * s; x++) {
            const ax = ((x - cx) % 6 + 6) % 6;
            if (ax >= 2 && ax <= 4)
                for (let y = Math.round(baseY - 6 * s) + (ax === 3 ? 0 : 1); y < baseY; y++)
                    put(x, y, C.win);
        }
        // Palms and greenery
        const palm = (px0, top) => {
            for (let y = top; y <= baseY; y++)
                put(px0 + Math.round(Math.sin((y - top) * 0.08) * 1.5), y, (y - top) % 3 === 0 ? C.palmTrunkDark : C.palmTrunk);
            for (let f = 0; f < 7; f++) {
                const a = (f / 6) * Math.PI;
                for (let r = 1; r < 10 * s; r++) {
                    const fx = px0 + Math.round(Math.cos(a) * r * 1.3), fy = top + Math.round(-Math.sin(a) * r * 0.6 + (r * r) / (14 * s));
                    put(fx, fy, r < 4 ? C.frondLit : f % 2 ? C.frond : C.frondDark);
                    put(fx, fy + 1, C.frondDark);
                }
            }
        };
        palm(Math.round(w * 0.2), Math.round(h * 0.42));
        palm(Math.round(w * 0.27), Math.round(h * 0.5));
        palm(Math.round(w * 0.78), Math.round(h * 0.44));
        for (let x = 0; x < w; x++) {
            const bh = Math.round((3 + hash(x >> 2, 9) * 4) * s);
            for (let y = baseY - bh; y < baseY; y++)
                if (Math.abs(x - cx) > 38 * s)
                    put(x, y, hash(x, y) < 0.35 ? C.bushLit : C.bush);
        }
        // Plaza pavement in perspective, warm light spilling across
        for (let y = baseY; y < h; y++)
            for (let x = 0; x < w; x++) {
                const d = (y - baseY) / (h - baseY);
                let k = bayer(x, y) < 0.3 ? C.pave2 : C.pave;
                if ((y - baseY) % Math.max(2, Math.round(2 + d * 7)) === 0)
                    k = C.paveLine;
                if (Math.round((x - cx) / (1 + d * 5)) % 6 === 0 && y > baseY + 1)
                    k = C.paveLine;
                if (Math.sin(x * 0.05 + y * 0.1) > 0.7 && d < 0.6)
                    k = C.paveWarm;
                put(x, y, k);
            }
        // Dark gateway framing the view
        const openL = Math.round(w * 0.06), openR = Math.round(w * 0.94);
        const spring = h * 0.3, apex = -h * 0.02;
        for (let y = 0; y < h; y++) {
            const hw = y >= spring ? (openR - openL) / 2 : ((openR - openL) / 2) * Math.sqrt(Math.max(0, 1 - ((spring - y) / (spring - apex)) ** 2));
            const l = Math.round(cx - hw), r = Math.round(cx + hw);
            for (let x = 0; x < w; x++) {
                if (x >= l && x <= r)
                    continue;
                const edge = x === l - 1 || x === r + 1;
                put(x, y, edge ? (x < cx ? C.frameEdge : C.frameEdgeLit) : (x + (y >> 1)) % 7 === 0 ? C.frameBrick : C.frame);
                isFrame[y * w + x] = 1;
            }
        }
    }
    const people = Array.from({ length: params.people ?? 16 }, (_, i) => ({
        x: hash(i, 61), y: 0.77 + hash(i, 62) * 0.2, v: (hash(i, 63) - 0.5) * 3, light: hash(i, 64) < 0.3,
    }));
    return {
        draw(_grid, t, px) {
            if (px.w !== w || px.h !== h) {
                w = px.w;
                h = px.h;
                s = h / 120;
                cx = Math.round(w / 2);
                build();
            }
            px.data.set(base);
            for (const p of people) {
                const x = Math.round((((p.x * w + t * p.v) % w) + w) % w);
                const yb = Math.round(p.y * h);
                const hp = Math.max(3, Math.round((3 + (p.y - 0.77) * 30) * s));
                if (isFrame[yb * w + x])
                    continue;
                for (let y = yb - hp + 1; y <= yb; y++)
                    px.set(x, y, p.light && y > yb - hp + 1 ? C.personLight : C.person);
                if (hp > 5 && Math.floor(t * 3 + p.x * 9) % 2)
                    px.set(x + 1, yb, C.person);
            }
        },
    };
}
