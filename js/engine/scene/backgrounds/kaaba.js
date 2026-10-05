// Generated from rpi-dashboard/apps/web/src/scene/backgrounds/kaaba.ts by tools/sync-dashboard.mjs. Edit it there.
import { bayer, hash } from '../pixels.js';
/**
 * Midday at the Kaaba, seen from the mataf: pale bright sky, two minarets behind, the golden
 * Ottoman arcade on the left and the white expansion on the right, the Kaaba in its kiswa with
 * the gold hizam, door and raised white lower wrap, white marble floor, rows of pilgrims in ihram.
 */
export function kaaba(ctx, params = {}) {
    const C = Object.fromEntries(Object.entries({
        // Ottoman arcade (left)
        otStone: '#8f8b86', otStoneDark: '#6f6b67', otDome: '#a3a3aa', otDomeHi: '#c4c4ca', otArch: '#b98c52', otArchLit: '#d8ad6a', otOpen: '#3a2e26', otLamp: '#ffd98a',
        // Modern expansion (right)
        exWhite: '#f3f2ee', exShade: '#d9d7d1', exOpen: '#2d2a2e', exRail: '#e6e3dc', exGold: '#c9a14a', exPole: '#c9c6bf',
        // Minarets
        minLit: '#f7f4ec', minShade: '#d6d0c4', minBalcony: '#e8e3d8', gold: '#d9b25a',
        // Kaaba
        kiswa: '#16141a', kiswaWeave: '#221e27', kiswaSide: '#0e0c11', kiswaSideWeave: '#18151c',
        hizam: '#c9a14a', hizamHi: '#ecca78', hizamDark: '#8a6a2a', hizamSide: '#a6843c',
        wrap: '#f5f4f0', wrapShade: '#dedcd6', wrapSide: '#c9c6bf', base: '#6b5530', baseHi: '#a88a4a',
        // Floor
        marble: '#f7f7f4', marble2: '#eeeeea', tile: '#e4e3de', band: '#d9cdb6',
        // Pilgrims
        ihram: '#f6f5f1', ihramShade: '#dcd9d2', hair: '#2a2420', shemagh: '#d98a8a', abaya: '#1a181c', bag: '#3f7a4a', shadow: '#e6e4de',
    }).map(([k, v]) => [k, ctx.palette.id(v)]));
    const sky = ['#86acd6', '#94b6dc', '#a3c0e1', '#b2cae6', '#c0d4ea', '#cedeef'].map((c) => ctx.palette.id(c));
    let base = new Uint16Array(0);
    let w = 0, h = 0, s = 1, cx = 0;
    let rows = [];
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
        const bldBottom = Math.round(h * 0.62);
        // Sky
        for (let y = 0; y < bldBottom; y++)
            for (let x = 0; x < w; x++) {
                const f = Math.min(0.999, y / (h * 0.55)) * (sky.length - 1);
                const i = Math.floor(f);
                put(x, y, f - i > bayer(x, y) ? sky[Math.min(sky.length - 1, i + 1)] : sky[i]);
            }
        // Minarets (behind everything else)
        const minaret = (mx, top, bottom, wid) => {
            put(mx, top - 2, C.gold);
            put(mx, top - 1, C.gold);
            rect(mx - 1, top, mx + 1, top + 1, C.gold);
            for (let y = top + 2; y <= bottom; y++) {
                const t = (y - top) / (bottom - top);
                const hw = t < 0.25 ? wid - 1 : wid;
                rect(mx - hw, y, mx + hw, y, (x) => (x > mx ? C.minShade : C.minLit));
                if ([0.12, 0.25, 0.42].some((b) => Math.abs(t - b) < 0.6 / (bottom - top)))
                    rect(mx - hw - 1, y, mx + hw + 1, y, C.minBalcony);
                if (t > 0.3 && (y - top) % 5 === 0)
                    put(mx, y, C.minShade);
            }
        };
        minaret(Math.round(cx - 14 * s), Math.round(h * 0.04), bldBottom, Math.max(1, Math.round(1.6 * s)));
        minaret(Math.round(cx + 14 * s), Math.round(h * 0.04), bldBottom, Math.max(1, Math.round(1.6 * s)));
        minaret(Math.round(w * 0.04), Math.round(h * 0.13), bldBottom, Math.max(1, Math.round(1.4 * s)));
        minaret(Math.round(w * 0.12), Math.round(h * 0.2), bldBottom, Math.max(1, Math.round(1.2 * s)));
        // Ottoman arcade, left: stone upper storey with small domes, golden arches below
        const otTop = Math.round(h * 0.47), otMid = Math.round(h * 0.53);
        const otRight = Math.round(cx - 20 * s);
        for (let x = 0; x <= otRight; x++) {
            const dx = ((x % 7) + 7) % 7;
            const dome = Math.round(Math.sqrt(Math.max(0, 9 - (dx - 3) ** 2)) * 0.8 * s);
            for (let y = otTop - dome; y < otTop; y++)
                put(x, y, dx < 3 ? C.otDomeHi : C.otDome);
            rect(x, otTop, x, otMid, (xx, y) => (y === otTop || y === otMid ? C.otStoneDark : (y - otTop) % 3 === 1 && xx % 4 === 1 ? C.otOpen : C.otStone));
            for (let y = otMid + 1; y < bldBottom; y++) {
                const ax = ((x % 6) + 6) % 6;
                const archTop = otMid + 2 + (ax === 0 || ax === 5 ? 0 : ax === 1 || ax === 4 ? 1 : 2);
                let k = ax === 0 ? C.otArchLit : C.otArch;
                if (ax >= 1 && ax <= 4 && y > archTop)
                    k = y === archTop + 2 && (ax === 2 || ax === 3) ? C.otLamp : C.otOpen;
                put(x, y, k);
            }
        }
        // Modern expansion, right: white tiers of arches, balustrade, lamp poles, gold medallions
        const exLeft = Math.round(cx + 20 * s);
        const tiers = [h * 0.36, h * 0.44, h * 0.53].map(Math.round);
        for (let x = exLeft; x < w; x++) {
            const persp = (x - exLeft) / (w - exLeft);
            for (let y = tiers[0]; y < bldBottom; y++) {
                const tier = y < tiers[1] ? 0 : y < tiers[2] ? 1 : 2;
                const t0 = tiers[tier], t1 = tier === 2 ? bldBottom : tiers[tier + 1];
                const period = Math.round((tier === 2 ? 9 : 6) * s * (0.8 + persp * 0.4));
                const ax = ((x - exLeft) % period + period) % period;
                const openW = Math.round(period * 0.55), openTop = t0 + Math.round((t1 - t0) * 0.3);
                let k = x > w - (w - exLeft) * 0.15 ? C.exShade : C.exWhite;
                if (y === t0)
                    k = C.exRail;
                else if (ax >= 1 && ax <= openW && y >= openTop && y < t1 - 1) {
                    const archRise = Math.abs(ax - (openW + 1) / 2) > openW / 2 - 1 ? 1 : 0;
                    k = y >= openTop + archRise ? C.exOpen : k;
                }
                else if (tier === 1 && ax === period - 2 && y === t0 + 2)
                    k = C.exGold;
                put(x, y, k);
            }
            if ((x - exLeft) % Math.round(14 * s) === 3)
                for (let y = tiers[0] - Math.round(5 * s); y < tiers[0]; y++)
                    put(x, y, C.exPole);
            if ((x - exLeft) % Math.round(14 * s) === 3)
                put(x, tiers[0] - Math.round(5 * s) - 1, C.otLamp);
        }
        // Floor: white marble, faint tile rows, beige circular bands around the Kaaba
        const kBase = Math.round(h * 0.645);
        for (let y = bldBottom; y < h; y++)
            for (let x = 0; x < w; x++) {
                const d = (y - bldBottom) / (h - bldBottom);
                let k = bayer(x, y) < 0.2 ? C.marble2 : C.marble;
                const rowSpacing = Math.max(2, Math.round(2 + d * 8));
                if ((y - bldBottom) % rowSpacing === 0)
                    k = C.tile;
                const ex = (x - cx) / (2.2 * s), ey = (y - kBase) / (0.5 * s);
                const r = Math.hypot(ex, ey);
                if (y > kBase && [12, 20, 30].some((b) => Math.abs(r - b) < 0.35))
                    k = C.band;
                put(x, y, k);
            }
        // The Kaaba
        const fL = Math.round(cx - 22 * s), fR = Math.round(cx + 9 * s), sR = Math.round(cx + 21 * s);
        const top = Math.round(h * 0.27), bandY = Math.round(top + (kBase - top) * 0.24);
        const wrapY = Math.round(top + (kBase - top) * 0.74);
        for (let y = top; y <= kBase; y++)
            for (let x = fL; x <= sR; x++) {
                const side = x > fR;
                // The side face recedes: its top edge slopes down slightly
                if (side && y < top + Math.round((x - fR) * 0.12))
                    continue;
                const weave = (x + y * 2) % 5 === 0 || (x - y * 2) % 7 === 0;
                let k = side ? (weave ? C.kiswaSideWeave : C.kiswaSide) : weave ? C.kiswaWeave : C.kiswa;
                if (y >= bandY && y <= bandY + Math.round(2 * s)) {
                    k = side ? C.hizamSide : (x + y) % 4 === 0 ? C.hizamDark : y === bandY ? C.hizamHi : C.hizam;
                }
                else if (!side && y > bandY + 3 * s && y < bandY + 7 * s && ((x - fL) % Math.round(8 * s)) >= 2 && ((x - fL) % Math.round(8 * s)) <= 5) {
                    k = y === Math.round(bandY + 4 * s) ? C.hizamHi : C.hizam; // gold panels below the band
                }
                if (!side && x >= fR - Math.round(5 * s) && x <= fR - Math.round(2 * s) && y > bandY + 2 * s && y < wrapY) {
                    k = x === fR - Math.round(5 * s) ? C.hizamHi : (y % 3 === 0 ? C.hizamDark : C.hizam); // the door
                }
                if (y >= wrapY)
                    k = side ? C.wrapSide : (x - fL) % Math.round(6 * s) === 0 ? C.wrapShade : C.wrap;
                if (y >= kBase - Math.max(1, Math.round(1.5 * s)))
                    k = y === kBase ? C.base : C.baseHi;
                put(x, y, k);
            }
        // Pilgrims in rows: a back row (moving in tawaf) and a front row standing in prayer
        rows = [];
        const perRow = Math.round((params.crowd ?? 70) * (w / 192));
        for (const [row, yy, hh] of [[0, h * 0.675, 6 * s], [1, h * 0.705, 8 * s], [2, h * 0.745, 10 * s]])
            for (let i = 0; i < perRow; i++) {
                const r = hash(i, row * 7 + 1);
                const head = r < 0.7 ? C.hair : r < 0.82 ? C.shemagh : r < 0.9 ? C.abaya : C.ihram;
                rows.push({
                    x: (i + hash(i, row * 7 + 2) * 0.6) * (w / perRow), y: yy + (hash(i, row * 7 + 3) - 0.5) * 2 * s,
                    hgt: Math.round(hh * (0.85 + hash(i, row * 7 + 4) * 0.25)), head, body: head === C.abaya ? C.abaya : C.ihram, row, ph: hash(i, row * 7 + 5) * 6,
                });
            }
    }
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
            for (const p of rows) {
                // Back row drifts slowly (tawaf); the front row stands, swaying slightly
                const x = Math.round(p.row === 0 ? (((p.x - t * 1.2) % w) + w) % w : p.x + Math.sin(t * 0.3 + p.ph) * 0.4);
                const yb = Math.round(p.y);
                const wid = Math.max(2, Math.round(p.hgt / 4));
                for (let dx = 0; dx < wid; dx++)
                    px.set(x + dx, yb + 1, C.shadow);
                const headRows = Math.max(1, Math.round(p.hgt / 5));
                const headW = Math.max(1, wid - 1);
                for (let y = yb - p.hgt + 1; y <= yb; y++)
                    for (let dx = 0; dx < wid; dx++) {
                        const isHead = y <= yb - p.hgt + headRows;
                        if (isHead && dx >= headW)
                            continue; // heads are narrower than shoulders
                        let k = isHead ? p.head : dx === wid - 1 ? (p.body === C.abaya ? C.abaya : C.ihramShade) : p.body;
                        if (p.body === C.ihram && y === yb - Math.round(p.hgt * 0.45) && hash(p.x, 3) < 0.15)
                            k = C.bag;
                        px.set(x + dx, y, k);
                    }
            }
        },
    };
}
