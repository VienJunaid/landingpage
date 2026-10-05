// Generated from rpi-dashboard/apps/web/src/scene/backgrounds/haram.ts by tools/sync-dashboard.mjs. Edit it there.
import { bayer, hash } from '../pixels.js';
/** Width ÷ height of one pixel (half a 10×18 cell) — used to keep circles round. */
const A = 1.11;
const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x, y) => noise(x, y) * 0.6 + noise(x * 2.1, y * 2.1) * 0.3 + noise(x * 4.3, y * 4.3) * 0.1;
/**
 * Masjid al-Haram from the sky at night: the Kaaba at the center, pilgrims in tawaf, the lit
 * marble mataf, the Ottoman arcade of little domes, expansion rooftops, minarets, the clock
 * tower complex, city lights and the mountains of Makkah.
 */
export function haram(ctx, params = {}) {
    const P = Object.fromEntries(Object.entries({
        ground: '#161522', street: '#2a2838', road: '#b8743f', roadLight: '#ffb45e',
        roof1: '#211f30', roof2: '#282537', roof3: '#302c40', roof4: '#252239',
        winWarm: '#ffcf6e', winCool: '#cfdcff',
        mtn1: '#1d1820', mtn2: '#2a222c', mtn3: '#3a2f3a', mtnLit: '#4a3d48',
        mRoof: '#c9c0b0', mRoofLine: '#a39a8b', mRoofDark: '#8a8174', skylight: '#5a4f45', skyGlow: '#ffd89a',
        plaza: '#e8e4da', plazaLine: '#cfcabe',
        domeHi: '#fff3d8', domeLit: '#efe3c8', domeMid: '#d8c9ab', domeRoof: '#b9a88e', domeShade: '#cdbd9f', domeDark: '#8f8068',
        arch: '#ffcf85',
        marble: '#eeece6', marbleHi: '#fbfaf6', marbleLo: '#e0ded8', ring: '#f7f5ef', ringEdge: '#b9b6ae', ringLight: '#fff1c4',
        kaaba: '#141217', kaabaEdge: '#29252f', hizam: '#d8a94a', hizamHi: '#f2cf72',
        hijr: '#a9a69e', maqam: '#e7c35a', maqamGlass: '#f6e7b0',
        minaret: '#f4ecd8', minaretGlow: '#ffe6a8', minaretBase: '#9c9486',
        tower: '#f4f1e6', towerGlow: '#5fd08a', complex: '#34324a', complexLine: '#45425c',
        p1: '#4b4858', p2: '#5f5c6b', p3: '#7d7a88', p4: '#9b98a6', p5: '#bcbac4', pigeon: '#d9dbe4',
    }).map(([k, v]) => [k, ctx.palette.id(v)]));
    const speed = params.speed ?? 1;
    let base = new Uint16Array(0);
    let w = 0, h = 0, cx = 0, cy = 0, s = 1;
    let windows = [];
    let pilgrims = [];
    function build() {
        base = new Uint16Array(w * h);
        windows = [];
        const put = (x, y, c) => {
            if (x >= 0 && y >= 0 && x < w && y < h)
                base[y * w + x] = c;
        };
        const kxi = Math.round(cx), kyi = Math.round(cy); // integer anchor so tile patterns line up
        // Distance in "vertical pixel" units, corrected for pixel shape.
        const R = (x, y) => Math.hypot((x - cx) * A, y - cy) / s;
        const superE = (x, y, rx, ry, n) => Math.abs(((x - cx) * A) / (rx * s)) ** n + Math.abs((y - cy) / (ry * s)) ** n;
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                const outer = superE(x, y, 92, 54, 4);
                const portico = superE(x, y, 46, 42, 6);
                const inner = superE(x, y, 36, 33, 6);
                const r = R(x, y);
                if (outer > 1) {
                    // City: blocks, streets, lit windows; mountains toward the edges
                    const edge = Math.max(0, Math.sqrt(outer) - 1.25);
                    const m = fbm(x * 0.06, y * 0.07) * 0.8 + edge * 0.9;
                    if (m > 0.78) {
                        const slope = fbm(x * 0.06, y * 0.07) - fbm((x - 1) * 0.06, (y - 1) * 0.07);
                        const k = Math.min(3, Math.max(0, Math.floor((m - 0.78) * 6 + slope * 30 + bayer(x, y) * 0.8)));
                        put(x, y, [P.mtn1, P.mtn2, P.mtn3, P.mtnLit][k]);
                        continue;
                    }
                    if (x % 5 === 0 || y % 4 === 0) {
                        put(x, y, P.street);
                        continue;
                    }
                    const bid = Math.floor(x / 5) * 31 + Math.floor(y / 4);
                    put(x, y, [P.roof1, P.roof2, P.roof3, P.roof4][Math.floor(hash(bid, 7) * 4)]);
                    const hw = hash(x, y);
                    if (hw < 0.08 - edge * 0.05) {
                        const c = hw < 0.03 ? P.winCool : P.winWarm;
                        put(x, y, c);
                        windows.push([x, y, c]);
                    }
                    continue;
                }
                if (portico > 1) {
                    // Expansion rooftops: tiled marble roof with rows of skylights, white courtyards at the rim
                    const ix = x - kxi, iy = y - kyi;
                    const lx = ((ix % 6) + 6) % 6, ly = ((iy % 5) + 5) % 5;
                    let k = P.mRoof;
                    if (lx === 0 || ly === 0)
                        k = P.mRoofLine;
                    else if (lx === 3 && ly === 2)
                        k = hash(Math.floor(ix / 6), Math.floor(iy / 5)) < 0.45 ? P.skyGlow : P.skylight;
                    if (outer > 0.86)
                        k = (x + y) % 2 ? P.plaza : P.plazaLine;
                    put(x, y, k);
                    continue;
                }
                if (inner > 1) {
                    // Ottoman arcade: rows of small shaded domes, warm lit arches on the inner edge
                    const lx = (((x - kxi) % 4) + 4) % 4, ly = (((y - kyi) % 4) + 4) % 4;
                    const d = Math.hypot(lx - 1.5, ly - 1.5);
                    let dome = P.domeDark;
                    if (d < 1.6)
                        dome = lx + ly <= 1 ? P.domeHi : lx + ly <= 3 ? P.domeLit : lx + ly <= 4 ? P.domeMid : P.domeShade;
                    else if (d < 2.1)
                        dome = P.domeRoof;
                    put(x, y, inner < 1.12 && (x + y) % 2 === 0 ? P.arch : dome);
                    continue;
                }
                // Courtyard: floodlit marble, brighter toward the Kaaba, with the circular mataf bridge
                if (r >= 30 && r <= 32)
                    put(x, y, r < 30.6 || r > 31.4 ? P.ringEdge : hash(x, y) < 0.15 ? P.ringLight : P.ring);
                else
                    put(x, y, r < 16 && bayer(x, y) < 1 - r / 16 ? P.marbleHi : r > 25 && bayer(x, y) < (r - 25) / 8 ? P.marbleLo : P.marble);
            }
        /** A 2×2 light with a round, dithered halo — never a plus/cross shape. */
        function glow(gx, gy, core, halo, radius) {
            for (let dy = -3; dy <= 4; dy++)
                for (let dx = -3; dx <= 4; dx++) {
                    const d = Math.hypot((dx - 0.5) * A, dy - 0.5);
                    if (dx >= 0 && dx <= 1 && dy >= 0 && dy <= 1)
                        put(gx + dx, gy + dy, core);
                    else if (d <= radius && bayer(gx + dx, gy + dy) < 0.75 - d / (radius * 2))
                        put(gx + dx, gy + dy, halo);
                }
        }
        // Main roads radiating out into the city, lined with lights
        for (const deg of [18, 62, 108, 152, 205, 248, 292, 338]) {
            const a = (deg * Math.PI) / 180;
            for (let d = 0; d < 200 * s; d += 0.5) {
                const x = Math.round(cx + (Math.cos(a) * d) / A), y = Math.round(cy - Math.sin(a) * d);
                if (x < 0 || y < 0 || x >= w || y >= h)
                    break;
                if (superE(x, y, 92, 54, 4) <= 1.02)
                    continue;
                const i = y * w + x;
                if ([P.mtn1, P.mtn2, P.mtn3, P.mtnLit].includes(base[i]))
                    continue;
                put(x, y, Math.floor(d) % 3 === 0 ? P.roadLight : P.road);
            }
        }
        // Clock tower complex to the south
        const top = Math.round(cy + 49 * s);
        for (let y = top; y < h; y++)
            for (let x = Math.round(cx - 22 * s); x <= cx + 22 * s; x++)
                put(x, y, x % 4 === 0 || (y - top) % 3 === 0 ? P.complexLine : hash(x, y) < 0.18 ? P.winWarm : P.complex);
        glow(Math.round(cx), Math.round(cy + 54 * s), P.tower, P.towerGlow, 3);
        // Minarets: glowing points around the rim
        for (const deg of [150, 162, 198, 210, 262, 278, 20, 32, 340, 90]) {
            const a = (deg * Math.PI) / 180;
            // walk outward until just inside the outer boundary
            let d = 20 * s;
            while (superE(cx + (Math.cos(a) * d) / A, cy - Math.sin(a) * d, 92, 54, 4) < 0.8)
                d += 0.5;
            glow(Math.round(cx + (Math.cos(a) * d) / A), Math.round(cy - Math.sin(a) * d), P.minaret, P.minaretGlow, 2.3);
        }
        const kx = Math.round(cx), ky = Math.round(cy);
        const khw = Math.round(4 * s), khh = Math.round(4 * s);
        // The Kaaba: black kiswa roof, gold hizam band on the face toward us
        for (let y = ky - khh; y <= ky + khh + 1; y++)
            for (let x = kx - khw; x <= kx + khw - 1; x++) {
                let k = P.kaaba;
                if (y === ky - khh || x === kx - khw || x === kx + khw - 1)
                    k = P.kaabaEdge;
                if (y === ky + khh)
                    k = x < kx ? P.hizamHi : P.hizam;
                put(x, y, k);
            }
        // Pilgrims: denser near the Kaaba, some on the mataf bridge
        const n = Math.round((params.pilgrims ?? 900) * s * s);
        const colors = [P.p1, P.p2, P.p3, P.p3, P.p4, P.p4, P.p5, P.marbleHi];
        pilgrims = Array.from({ length: n }, (_, i) => {
            const onBridge = hash(i, 3) < 0.12;
            const r = (onBridge ? 30.3 + hash(i, 1) * 1.4 : 7.2 + 21 * Math.pow(hash(i, 1), 1.5)) * s;
            return { r, a0: hash(i, 2) * Math.PI * 2, w: (0.9 + hash(i, 4) * 0.5) / r, c: colors[Math.floor(hash(i, 5) * colors.length)] };
        });
    }
    const pigeons = Array.from({ length: params.pigeons ?? 14 }, (_, i) => ({
        a0: hash(i, 51) * Math.PI * 2, r: 0.55 + hash(i, 52) * 0.35, w: 0.08 + hash(i, 53) * 0.05, ph: hash(i, 54) * 6,
    }));
    return {
        draw(_grid, t, px) {
            if (px.w !== w || px.h !== h) {
                w = px.w;
                h = px.h;
                cx = (w - 1) / 2;
                cy = (h - 1) / 2;
                s = h / 120;
                build();
            }
            px.data.set(base);
            const ts = t * speed;
            // City lights flicker off and on slowly
            const epoch = Math.floor(ts * 0.4);
            for (let i = 0; i < windows.length; i++)
                if (hash(i, epoch) < 0.06)
                    px.set(windows[i][0], windows[i][1], P.roof2);
            // Tawaf: counter-clockwise around the Kaaba
            const kx = Math.round(cx), ky = Math.round(cy), khw = Math.round(4 * s), khh = Math.round(4 * s);
            for (const p of pilgrims) {
                const a = p.a0 + ts * p.w * 6;
                const x = Math.round(cx + (Math.cos(a) * p.r) / A);
                const y = Math.round(cy - Math.sin(a) * p.r);
                if (x >= kx - khw - 1 && x <= kx + khw && y >= ky - khh - 1 && y <= ky + khh + 2)
                    continue;
                if (y < ky - khh && Math.hypot((x - kx) * A / (6.5 * s), (y - ky + khh + 1) / (5 * s)) < 1)
                    continue; // inside Hijr
                px.set(x, y, p.c);
            }
            // Hijr Ismail (low semicircular wall on the north side) and Maqam Ibrahim, above the crowd
            for (let t2 = 0; t2 <= Math.PI; t2 += 0.04)
                px.set(Math.round(kx + (Math.cos(t2) * 6.5 * s) / A), Math.round(ky - khh - 1 - Math.sin(t2) * 5 * s), P.hijr);
            px.set(kx + khw + 3, ky - khh + 1, P.maqam);
            px.set(kx + khw + 4, ky - khh + 1, P.maqamGlass);
            // Pigeons wheeling over the courtyard
            for (const b of pigeons) {
                const a = b.a0 + ts * b.w;
                const x = Math.round(cx + (Math.cos(a) * b.r * 60 * s) / A + Math.sin(ts + b.ph) * 3);
                const y = Math.round(cy - Math.sin(a) * b.r * 45 * s);
                const up = Math.floor(ts * 6 + b.ph) % 2 === 0;
                px.set(x, y, P.pigeon);
                px.set(x - 1, up ? y - 1 : y, P.pigeon);
                px.set(x + 1, up ? y - 1 : y, P.pigeon);
            }
        },
    };
}
