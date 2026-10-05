// Generated from rpi-dashboard/apps/web/src/scene/backgrounds/farooqNight.ts by tools/sync-dashboard.mjs. Edit it there.
import { bayer, hash } from '../pixels.js';
/**
 * Isha at Masjid Al-Farooq, Atlanta, with the night market in the courtyard: the floodlit masjid
 * (arcade, central tower with its arched window, copper dome and small minaret, right wing),
 * a starry sky with a crescent moon, the star-shaped fountain, rows of glowing canopy tents with
 * people lining up, string lights overhead, and steam rising from the food stalls.
 */
export function farooqNight(ctx, params = {}) {
    const C = Object.fromEntries(Object.entries({
        star: '#e8ecff', starDim: '#8a93c0', moon: '#fff4d6', moonShade: '#e6d4a8',
        tree: '#0f1d19', treeLit: '#1c3129',
        stone: '#dcc6a2', stoneLit: '#ecd9b8', stoneShade: '#b09878', stoneDark: '#8a7458', cornice: '#f2e4c8',
        archIn: '#2a2030', archGlow: '#ffcf7a', winLit: '#ffd98a', winDark: '#34283a', door: '#4a3222', doorDark: '#2e1f16',
        copper: '#c9784c', copperLit: '#eb9a6a', copperShade: '#8e4e32', copperHi: '#ffc090', gold: '#e8b85a',
        step: '#a89478', stepLine: '#7c6c58',
        pave: '#7f7264', pave2: '#8c7e6e', paveLine: '#5e5448', paveWarm: '#b29670',
        rim: '#d8c8a8', rimShade: '#a8987a', water: '#34587a', waterLit: '#5a86ac', spark: '#cfe8ff',
        tentW: '#f2ede4', tentLit: '#ffe7bf', tentShade: '#c9bfae', tentG: '#2f7d5a', tentR: '#c0392b', tentB: '#2c3e6b',
        pole: '#9a9a9a', table: '#6b4a32', glow: '#ffdca0',
        good1: '#e8a23a', good2: '#d9534f', good3: '#5cb85c', good4: '#f0e0b0', good5: '#8e5ab8',
        bulb: '#ffd27a', bulbR: '#ff7a6a', bulbG: '#8ae0a0', bulbB: '#8ab8ff', wire: '#3a3448',
        steam: '#e6e6ea', steamDim: '#a6a8b4',
        p1: '#2c2c37', p2: '#6d4b5e', p3: '#3f6a8a', p4: '#c9a080', p5: '#8a3a3a', p6: '#e8e2d6', skin: '#c89a78',
    }).map(([k, v]) => [k, ctx.palette.id(v)]));
    const sky = ['#070b1c', '#0b1024', '#111a36', '#182446', '#202e54', '#2a3860'].map((c) => ctx.palette.id(c));
    let base = new Uint16Array(0);
    let w = 0, h = 0, s = 1, cx = 0;
    let tents = [];
    let queue = [];
    let bulbs = [];
    let fountain = { x: 0, y: 0, rx: 0, ry: 0 };
    function build() {
        base = new Uint16Array(w * h);
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
        const ground = Math.round(h * 0.665);
        // Night sky, stars, crescent moon
        for (let y = 0; y < ground; y++)
            for (let x = 0; x < w; x++) {
                const f = Math.min(0.999, y / (h * 0.6)) * (sky.length - 1);
                const i = Math.floor(f);
                put(x, y, f - i > bayer(x, y) ? sky[Math.min(sky.length - 1, i + 1)] : sky[i]);
                if (y < h * 0.4 && hash(x, y) < 0.012)
                    put(x, y, hash(y, x) < 0.4 ? C.star : C.starDim);
            }
        const mx = Math.round(w * 0.27), my = Math.round(h * 0.13), mr = Math.round(5 * s);
        for (let y = my - mr; y <= my + mr; y++)
            for (let x = mx - mr; x <= mx + mr; x++) {
                const d1 = Math.hypot(x - mx, y - my), d2 = Math.hypot(x - mx - 2.5 * s, y - my + 1.5 * s);
                if (d1 <= mr && d2 > mr * 0.85)
                    put(x, y, d1 > mr - 1 ? C.moonShade : C.moon);
            }
        // Trees at the edges
        for (let x = 0; x < w; x++) {
            const edge = Math.max(0, 1 - x / (w * 0.12), (x - w * 0.9) / (w * 0.1));
            if (edge <= 0)
                continue;
            const top = Math.round(ground - (18 + hash(x >> 1, 4) * 10) * s * Math.min(1, edge * 1.6));
            for (let y = top; y < ground; y++)
                put(x, y, hash(x, y) < 0.15 ? C.treeLit : C.tree);
        }
        // The masjid, floodlit
        const L = Math.round(w * 0.13), TL = Math.round(w * 0.42), TR = Math.round(w * 0.58), R = Math.round(w * 0.88);
        const wingTop = Math.round(h * 0.46), towerTop = Math.round(h * 0.36);
        // Left wing: cornice and an arcade of five arches
        rect(L, wingTop, TL, ground, (x, y) => (y <= wingTop + 1 ? C.cornice : x < L + 2 ? C.stoneShade : C.stone));
        const arcTop = Math.round(h * 0.52), bay = (TL - L) / 5;
        for (let i = 0; i < 5; i++) {
            const bx0 = Math.round(L + i * bay + 2 * s), bx1 = Math.round(L + (i + 1) * bay - 2 * s);
            const mid = (bx0 + bx1) / 2, hw = (bx1 - bx0) / 2;
            for (let y = arcTop; y < ground; y++)
                for (let x = bx0; x <= bx1; x++) {
                    const dx = Math.abs(x - mid) / hw;
                    const archY = arcTop + Math.round((1 - Math.sqrt(Math.max(0, 1 - dx * dx))) * hw * 0.9);
                    if (y < archY)
                        continue;
                    put(x, y, y < archY + 2 && dx < 0.6 ? C.archGlow : C.archIn);
                }
            rect(bx1 + 1, arcTop, Math.round(L + (i + 1) * bay + 2 * s) - 1, ground, C.stoneLit); // columns
        }
        // Right wing: upper windows, lower arched entrance with wooden doors
        rect(TR, h * 0.41, R, ground, (x, y) => (y <= h * 0.41 + 1 ? C.cornice : x > R - 3 ? C.stoneShade : C.stone));
        for (let x = TR + 4, n = 0; x < R - 4; x += Math.round(7 * s), n++) {
            const lit = hash(n, 17) < 0.65;
            rect(x, h * 0.435, x + 3 * s, h * 0.5, (xx) => (lit ? (xx === x ? C.stoneShade : C.winLit) : C.winDark));
        }
        rect(TR, h * 0.525, R, h * 0.535, C.cornice);
        const eMid = Math.round((TR + R) / 2 + 6 * s), eHW = Math.round(8 * s);
        for (let y = Math.round(h * 0.555); y < ground; y++)
            for (let x = eMid - eHW; x <= eMid + eHW; x++) {
                const dx = Math.abs(x - eMid) / eHW;
                if (y < h * 0.555 + (1 - Math.sqrt(1 - dx * dx)) * eHW * 0.8)
                    continue;
                put(x, y, dx > 0.85 ? C.stoneShade : x === eMid ? C.doorDark : C.door);
            }
        // Central tower with a tall tripartite arched window
        rect(TL, towerTop, TR, ground, (x, y) => (y <= towerTop + 1 ? C.cornice : x > TR - 3 ? C.stoneShade : C.stoneLit));
        const wMid = Math.round((TL + TR) / 2);
        for (let y = Math.round(h * 0.39); y < h * 0.5; y++)
            for (let x = wMid - Math.round(6 * s); x <= wMid + Math.round(6 * s); x++) {
                const dx = Math.abs(x - wMid) / (6 * s);
                if (y < h * 0.39 + (1 - Math.sqrt(Math.max(0, 1 - dx * dx))) * 6 * s)
                    continue;
                put(x, y, Math.abs(x - wMid) === Math.round(2 * s) ? C.stone : C.winLit);
            }
        rect(wMid - 5 * s, h * 0.555, wMid + 5 * s, ground, (x, y) => (y < h * 0.575 ? C.archGlow : C.archIn));
        // Small minaret beside the dome, then the copper dome
        const mnx = Math.round(TR - 2 * s);
        rect(mnx - 1, h * 0.25, mnx + 1, towerTop, (x) => (x > mnx ? C.stoneShade : C.stoneLit));
        put(mnx, Math.round(h * 0.25) - 1, C.copper);
        put(mnx, Math.round(h * 0.25) - 2, C.gold);
        rect(mnx - 2, h * 0.3, mnx + 2, h * 0.3, C.cornice);
        const dX = Math.round(TR + 10 * s), dBase = Math.round(h * 0.41), dR = Math.round(12 * s);
        rect(dX - dR, dBase, dX + dR, dBase + 2 * s, C.cornice);
        for (let y = 0; y <= dR * 0.95; y++) {
            const hw = Math.round(dR * Math.sqrt(Math.max(0, 1 - (y / dR) ** 2)));
            for (let x = dX - hw; x <= dX + hw; x++) {
                const u = (x - dX) / (hw + 0.5);
                const light = 0.55 - u * 0.4 + (y / dR) * 0.25 + (bayer(x, y) - 0.5) * 0.15;
                put(x, dBase - y, light > 0.85 ? C.copperHi : light > 0.6 ? C.copperLit : light > 0.35 ? C.copper : C.copperShade);
            }
        }
        put(dX, dBase - dR - 1, C.gold);
        put(dX, dBase - dR - 2, C.gold);
        // Steps and the courtyard
        for (let y = ground; y < ground + 3 * s; y++)
            rect(L - 4, y, R + 4, y, (y - ground) % 2 ? C.stepLine : C.step);
        const court = Math.round(ground + 3 * s);
        for (let y = court; y < h; y++)
            for (let x = 0; x < w; x++) {
                const d = (y - court) / (h - court);
                let k = bayer(x, y) < 0.3 ? C.pave2 : C.pave;
                if ((y - court) % Math.max(2, Math.round(2 + d * 6)) === 0)
                    k = C.paveLine;
                if (Math.round((x - cx) / (1 + d * 4)) % 5 === 0)
                    k = C.paveLine;
                put(x, y, k);
            }
        // Star-shaped fountain
        fountain = { x: Math.round(w * 0.36), y: Math.round(h * 0.77), rx: Math.round(14 * s), ry: Math.round(4 * s) };
        for (let y = fountain.y - fountain.ry - 1; y <= fountain.y + fountain.ry + 1; y++)
            for (let x = fountain.x - fountain.rx - 1; x <= fountain.x + fountain.rx + 1; x++) {
                const a = Math.atan2((y - fountain.y) / fountain.ry, (x - fountain.x) / fountain.rx);
                const star = 1 - 0.18 * Math.abs(Math.cos(a * 4));
                const r = Math.hypot((x - fountain.x) / fountain.rx, (y - fountain.y) / fountain.ry);
                if (r <= star - 0.2)
                    put(x, y, bayer(x, y) < 0.3 ? C.waterLit : C.water);
                else if (r <= star)
                    put(x, y, y > fountain.y ? C.rimShade : C.rim);
            }
        // Tents: a back row by the masjid, two front clusters either side of the couple
        tents = [];
        const tentColors = [C.tentW, C.tentG, C.tentR, C.tentB, C.tentW];
        const addTent = (x, y, scale, i) => tents.push({ x: Math.round(x), y: Math.round(y), wid: Math.round(20 * s * scale), hgt: Math.round(15 * s * scale), color: tentColors[i % tentColors.length] });
        for (let i = 0; i < 6; i++)
            addTent(w * (0.05 + i * 0.075), h * 0.745, 0.62, i);
        for (let i = 0; i < 3; i++)
            addTent(w * (0.62 + i * 0.12), h * 0.745, 0.62, i + 2);
        addTent(w * 0.04, h * 0.9, 1.05, 1);
        addTent(w * 0.2, h * 0.92, 1.1, 2);
        addTent(w * 0.68, h * 0.92, 1.1, 3);
        addTent(w * 0.84, h * 0.9, 1.05, 0);
        tents.sort((a, b) => a.y - b.y);
        for (const t of tents) {
            const top = t.y - t.hgt, canopyH = Math.max(2, Math.round(t.hgt * 0.28)), val = Math.max(1, Math.round(t.hgt * 0.1));
            // Warm pool of light on the ground
            for (let y = t.y; y < t.y + 3 * s; y++)
                for (let x = t.x - 2; x <= t.x + t.wid + 2; x++)
                    if (bayer(x, y) < 0.5)
                        put(x, y, C.paveWarm);
            // Canopy (peaked) and scalloped valance
            for (let r = 0; r < canopyH; r++) {
                const inset = Math.round(((canopyH - 1 - r) / canopyH) * t.wid * 0.35);
                for (let x = t.x + inset; x <= t.x + t.wid - inset; x++) {
                    const stripe = t.color !== C.tentW && Math.floor((x - t.x) / Math.max(2, Math.round(3 * s))) % 2 === 0;
                    put(x, top + r, stripe ? t.color : r === canopyH - 1 ? C.tentShade : C.tentW);
                }
            }
            for (let x = t.x; x <= t.x + t.wid; x++)
                for (let r = 0; r < val + ((x - t.x) % 4 < 2 ? 1 : 0); r++)
                    put(x, top + canopyH + r, t.color === C.tentW ? C.tentShade : t.color);
            // Lit interior, table with goods, poles
            for (let y = top + canopyH + val; y < t.y; y++)
                for (let x = t.x + 1; x < t.x + t.wid; x++)
                    put(x, y, y < t.y - t.hgt * 0.35 ? C.tentLit : C.glow);
            const tableY = Math.round(t.y - t.hgt * 0.3);
            rect(t.x + 1, tableY, t.x + t.wid - 1, t.y - 1, (x, y) => (y === tableY ? C.table : C.table));
            for (let x = t.x + 2; x < t.x + t.wid - 1; x++)
                if (hash(x, t.y) < 0.6)
                    put(x, tableY - 1, [C.good1, C.good2, C.good3, C.good4, C.good5][Math.floor(hash(t.y, x) * 5)]);
            for (const px0 of [t.x, t.x + t.wid])
                for (let y = top + canopyH; y <= t.y; y++)
                    put(px0, y, C.pole);
        }
        // People queuing at each tent, standing in a line toward the viewer
        queue = [];
        const bodies = [C.p1, C.p2, C.p3, C.p4, C.p5, C.p6];
        tents.forEach((t, ti) => {
            const scale = t.hgt / (15 * s);
            const n = 2 + Math.floor(hash(ti, 1) * 4);
            for (let i = 0; i < n; i++) {
                queue.push({
                    x: t.x + t.wid * 0.5 + (i * 3 + 2) * s * scale * (t.x < cx ? 1 : -1) * 0.8,
                    y: t.y + (i + 1) * 2.2 * s * scale,
                    hgt: Math.round((7 + i * 0.4) * s * scale), body: bodies[Math.floor(hash(ti, i + 3) * 6)],
                    head: hash(ti, i + 9) < 0.5 ? C.skin : bodies[Math.floor(hash(i, ti) * 6)], ph: hash(ti, i) * 6,
                });
            }
        });
        // String lights: catenaries from the masjid out to the front tents
        bulbs = [];
        const lights = [C.bulb, C.bulbR, C.bulb, C.bulbG, C.bulb, C.bulbB];
        const anchors = [
            [L, wingTop, w * 0.04, h * 0.9 - 16 * s], [L + (TL - L) * 0.6, wingTop, w * 0.22, h * 0.92 - 17 * s],
            [R, h * 0.41, w * 0.97, h * 0.9 - 16 * s], [R - (R - TR) * 0.5, h * 0.41, w * 0.76, h * 0.92 - 17 * s],
        ];
        for (const [x0, y0, x1, y1] of anchors) {
            const n = Math.round(Math.hypot(x1 - x0, y1 - y0));
            for (let i = 0; i <= n; i++) {
                const t = i / n;
                const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 6 * s;
                put(x, y, C.wire);
                if (i % Math.max(3, Math.round(4 * s)) === 0)
                    bulbs.push({ x: Math.round(x), y: Math.round(y + 1), c: lights[(i / 4) % lights.length | 0], ph: hash(i, x0) * 6 });
            }
        }
    }
    const walkers = Array.from({ length: params.walkers ?? 10 }, (_, i) => ({
        x: hash(i, 91), y: 0.785 + hash(i, 92) * 0.04, v: (hash(i, 93) - 0.5) * 4, c: i % 6, ph: hash(i, 94) * 6,
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
            // Fountain: jet and sparkles on the water
            const jetH = Math.round((6 + Math.sin(t * 3) * 1) * s);
            for (let y = 0; y < jetH; y++)
                px.set(fountain.x, fountain.y - y, y > jetH - 2 ? C.spark : C.waterLit);
            for (let i = 0; i < 8; i++) {
                const a = hash(i, 5) * Math.PI * 2, r = hash(i, 6) * 0.7;
                if (Math.sin(t * 4 + i * 1.7) > 0.5)
                    px.set(Math.round(fountain.x + Math.cos(a) * r * fountain.rx), Math.round(fountain.y + Math.sin(a) * r * fountain.ry), C.spark);
            }
            // Steam from the food tents
            for (let i = 0; i < tents.length; i += 2) {
                const tn = tents[i];
                for (let k = 0; k < 3; k++) {
                    const life = ((t * 0.5 + k / 3 + i * 0.13) % 1);
                    const x = Math.round(tn.x + tn.wid * 0.5 + Math.sin(life * 6 + i) * 2);
                    const y = Math.round(tn.y - tn.hgt - life * 10 * s);
                    if (life < 0.8)
                        px.set(x, y, life < 0.4 ? C.steam : C.steamDim);
                }
            }
            // String lights twinkle
            for (const b of bulbs)
                px.set(b.x, b.y, Math.sin(t * 2.5 + b.ph) > -0.3 ? b.c : C.wire);
            // Queues (shuffling slightly) and walkers, far to near
            const figures = [];
            const figure = (x, yb, hp, body, head) => () => {
                const wid = Math.max(1, Math.round(hp / 4));
                for (let y = yb - hp + 1; y <= yb; y++)
                    for (let dx = 0; dx < wid; dx++)
                        px.set(x + dx, y, y <= yb - hp + Math.max(1, Math.round(hp / 5)) ? head : body);
            };
            for (const q of queue)
                figures.push({ y: q.y, draw: figure(Math.round(q.x + Math.sin(t * 0.7 + q.ph) * 0.4), Math.round(q.y), q.hgt, q.body, q.head) });
            const bodies = [C.p1, C.p2, C.p3, C.p4, C.p5, C.p6];
            for (const wk of walkers) {
                const x = Math.round((((wk.x * w + t * wk.v) % w) + w) % w);
                const yb = Math.round(wk.y * h);
                figures.push({ y: yb, draw: figure(x, yb, Math.round((6 + (wk.y - 0.785) * 40) * s), bodies[wk.c], C.skin) });
            }
            figures.sort((a, b) => a.y - b.y);
            for (const f of figures)
                f.draw();
        },
    };
}
