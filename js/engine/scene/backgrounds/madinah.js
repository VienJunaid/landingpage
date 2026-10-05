// Generated from rpi-dashboard/apps/web/src/scene/backgrounds/madinah.ts by tools/sync-dashboard.mjs. Edit it there.
import { bayer, hash } from '../pixels.js';
/** Colors that change at sunset (everything else keeps its daytime color). */
const SUNSET_COLORS = {
    cloud: '#ffd9b0', cloudMid: '#f5a98a', cloudShade: '#c07a8a',
    hill: '#8a5a78', hillShade: '#744a68',
    hotel1: '#e8b8a0', hotel2: '#d4a08e', hotel3: '#b88a82', glass: '#c89aa8', hotelWin: '#ffcf8a',
    minLit: '#ffe2c4', minShade: '#c9988e', minBalcony: '#f0c8a8', minUnder: '#9a6e6e',
    umbTop: '#ffe0c4', umbUnder: '#c49080', umbShadow: '#8e6070',
    wall: '#f6d2b2', wallShade: '#d4a894', arch: '#5a3a44', archWarm: '#ffc07a', parapet: '#eec0a0',
    sHi: '#ffe8d8', sLit: '#e8c0b8', sShade: '#a88a98',
    marble: '#f2d8cc', marble2: '#e4c4bc', tileLine: '#d4b0a8', walk: '#dcbcb0', walkLine: '#c09a94',
    kiosk: '#fbe2d0', kioskShade: '#e0bcae', postLit: '#e8b09a', lamp: '#ffd27a', lampGlow: '#fff4c4',
    white: '#fbe8dc',
    umbCanopy: '#fff1e0', umbCanopyLit: '#ffc896', umbBelly: '#f0a878', umbBellyShade: '#c47868',
};
const SUNSET_SKY = ['#2c2150', '#3f2a63', '#5b3470', '#7d3f78', '#a44d7c', '#cc6076', '#e87c6c', '#f79e64', '#fbc06a', '#ffd98a'];
/**
 * Masjid an-Nabawi seen from the plaza on a bright day: blue sky and clouds, hotels and the
 * hills behind, minarets, the Green Dome, shade umbrellas, and a marble plaza in true
 * perspective (each floor pixel is projected onto the ground to draw tiles, granite bands and
 * inlays), with lamp posts and people walking.
 */
export function madinah(ctx, params = {}) {
    const sunset = params.time === 'sunset';
    const C = Object.fromEntries(Object.entries({
        cloud: '#ffffff', cloudMid: '#e6f0fb', cloudShade: '#c7dbf0',
        hill: '#b3a3a6', hillShade: '#9e8f94',
        hotel1: '#e3d9cb', hotel2: '#d2c6b5', hotel3: '#c3b6a4', glass: '#a9bfd1', hotelWin: '#b4a591',
        minLit: '#f7f1e3', minShade: '#d4c8b3', minBalcony: '#e4d8c2', minUnder: '#a8987e', gold: '#e2b24a', greenTip: '#2f9e57',
        umbTop: '#f3ebdc', umbUnder: '#bda98b', umbShadow: '#8f7e66', umbPole: '#d8cfc0',
        wall: '#f0e5cf', wallShade: '#d9c8aa', arch: '#6f5d4b', archWarm: '#caa57a', parapet: '#e2d3b6', brick: '#c9977a',
        dHi: '#86dca3', dLit: '#45b872', dMid: '#2f9e57', dShade: '#207a44', dDeep: '#155a32', drum: '#efe3cc',
        sHi: '#f2f5f9', sLit: '#d9dfe8', sShade: '#a9b2c2',
        marble: '#ebe9e5', marble2: '#dcd9d5', tileLine: '#cbc8c4', walk: '#cfcac3', walkLine: '#b8b2aa',
        granite: '#2b2b33', inlayRed: '#b5473c', inlayDark: '#363644',
        kiosk: '#f8f7f3', kioskShade: '#dcdad4', kioskTrim: '#57544f', kioskWin: '#3a414d',
        postLit: '#d2a896', postShade: '#a67a6a', postBase: '#86665a', lamp: '#e4b54f', lampFrame: '#5a4630', lampGlow: '#fff0b8',
        white: '#f6f6f3', dark: '#2c2c37', brown: '#8a6d58', skin: '#c89a78',
        sun: '#fff4d0', sunEdge: '#ffcf80',
        umbCanopy: '#fbf7f0', umbCanopyLit: '#ffe6cc', umbBelly: '#e6d6c4', umbBellyShade: '#c9b39e', umbColumn: '#ece6dc', umbColumnShade: '#c8bfb2',
    }).map(([k, v]) => [k, ctx.palette.id(sunset && SUNSET_COLORS[k] ? SUNSET_COLORS[k] : v)]));
    const sky = (sunset ? SUNSET_SKY : ['#2a62c4', '#3572cf', '#4382d8', '#5692df', '#6aa2e5', '#80b2ea', '#98c3ee', '#b2d3f2']).map((c) => ctx.palette.id(c));
    let base = new Uint16Array(0);
    let isSky = new Uint8Array(0);
    let w = 0, h = 0, cx = 0, yv = 0, D = 1, F = 1, s = 1;
    // Ground projection: screen (x, y) ↔ world (u across, v distance)
    const toV = (y) => D / (y - yv);
    const toU = (x, v) => ((x - cx) * v) / F;
    const project = (u, v) => [cx + (u * F) / v, yv + D / v];
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
        const rect = (x0, y0, x1, y1, c) => {
            for (let y = Math.round(y0); y <= Math.round(y1); y++)
                for (let x = Math.round(x0); x <= Math.round(x1); x++)
                    put(x, y, typeof c === 'number' ? c : c(x, y));
        };
        const horizon = Math.round(h * 0.56);
        const facadeTop = Math.round(h * 0.53);
        const floorTop = Math.round(h * 0.615);
        // Sky
        for (let y = 0; y < horizon; y++)
            for (let x = 0; x < w; x++) {
                const f = Math.min(0.999, y / horizon) * (sky.length - 1);
                const i = Math.floor(f);
                base[y * w + x] = f - i > bayer(x, y) ? sky[Math.min(sky.length - 1, i + 1)] : sky[i];
                isSky[y * w + x] = 1;
            }
        // Setting sun low over the city, with a warm halo
        if (sunset) {
            const sx = Math.round(w * 0.2), sy = Math.round(h * 0.47), r = Math.round(6 * s);
            for (let y = sy - r - 1; y <= sy + r + 1; y++)
                for (let x = sx - r - 1; x <= sx + r + 1; x++) {
                    const d = Math.hypot(x - sx, y - sy);
                    if (d <= r - 0.5)
                        put(x, y, C.sun);
                    else if (d <= r + 0.8)
                        put(x, y, C.sunEdge);
                    if (y >= 0 && y < h && x >= 0 && x < w)
                        isSky[y * w + x] = 0;
                }
        }
        // Distant hills (right side, like Uhud behind the city)
        for (let x = 0; x < w; x++) {
            const t = x / w;
            const hh = Math.max(0, Math.round(s * (5 * Math.sin(t * 5 + 1) + 3 * Math.sin(t * 13) + 6) * Math.max(0, t - 0.35) * 1.6));
            for (let y = horizon - hh; y < horizon + 2; y++)
                put(x, y, (x + y) % 5 === 0 ? C.hillShade : C.hill);
        }
        // Hotels on the skyline
        let x = 0;
        while (x < w) {
            const bw = Math.round((6 + hash(x, 1) * 10) * s);
            const bh = Math.round((6 + hash(x, 2) * 10) * s);
            const kind = Math.floor(hash(x, 3) * 4);
            const col = [C.hotel1, C.hotel2, C.hotel3, C.glass][kind];
            rect(x, horizon - bh, x + bw - 1, horizon + 2, (xx, yy) => kind !== 3 && (yy - horizon) % 2 === 0 && (xx - x) % 3 !== 0 ? C.hotelWin : col);
            x += bw + (hash(x, 4) < 0.3 ? 2 : 0);
        }
        // Minarets (behind the facade): [x fraction, top y fraction, green tip]
        const minarets = [
            [0.205, 0.2, false], [0.35, 0.18, true], [0.41, 0.23, false], [0.455, 0.22, false],
            [0.552, 0.23, false], [0.593, 0.23, false], [0.664, 0.17, false], [0.806, 0.21, false],
        ];
        for (const [fx, fy, green] of minarets) {
            const mx = Math.round(w * fx), top = Math.round(h * fy);
            const len = floorTop - top;
            put(mx, top - 1, C.gold); // finial
            put(mx, top, green ? C.greenTip : C.gold);
            rect(mx - 1, top + 1, mx + 1, top + 2, green ? C.greenTip : C.gold); // cone
            for (let y = top + 3; y <= floorTop; y++) {
                const t = (y - top) / len;
                const hw = t < 0.35 ? 1 : 2;
                for (let dx = -hw; dx <= hw - 1; dx++)
                    put(mx + dx, y, dx < 0 ? C.minLit : C.minShade);
                if ([0.1, 0.34, 0.6].some((b) => Math.abs(t - b) < 0.5 / len)) {
                    rect(mx - hw - 1, y, mx + hw, y, C.minBalcony);
                    rect(mx - hw, y + 1, mx + hw - 1, y + 1, C.minUnder);
                }
            }
        }
        // Shade umbrellas left and right of the mosque: a row of arched canopies on poles,
        // with the shaded plaza underneath
        const umbY = Math.round(h * 0.545);
        const P = Math.max(6, Math.round(9 * s));
        for (const [x0, x1] of [[0, Math.round(w * 0.34)], [Math.round(w * 0.69), w - 1]]) {
            for (let xx = x0; xx <= x1; xx++) {
                const ph = ((xx % P) + P) % P;
                const k = (ph - P / 2) / (P / 2);
                const sag = Math.round((1 - k * k) * 3 * s); // arch: highest at the poles, lowest mid-span
                put(xx, umbY, C.umbTop);
                for (let y = umbY + 1; y <= umbY + 1 + (3 * s - sag); y++)
                    put(xx, y, C.umbTop);
                put(xx, umbY + 2 + Math.round(3 * s - sag), C.umbUnder);
                for (let y = umbY + 3 + Math.round(3 * s - sag); y <= floorTop; y++)
                    put(xx, y, ph === 0 ? C.umbPole : bayer(xx, y) < 0.35 ? C.umbShadow : C.umbUnder);
            }
        }
        // Mosque facade: parapet, cream wall, a row of arches; brick section on the left
        const fx0 = Math.round(w * 0.335), fx1 = Math.round(w * 0.69);
        rect(fx0, facadeTop, fx1, floorTop, (xx, yy) => {
            if (yy === facadeTop)
                return (xx - fx0) % 2 === 0 ? C.parapet : C.wallShade;
            if (xx < fx0 + Math.round(w * 0.035) && yy < facadeTop + Math.round(5 * s))
                return C.brick;
            const ax = (xx - fx0) % 5;
            const archTop = facadeTop + Math.round(5 * s);
            if (yy >= archTop && ax >= 1 && ax <= 3) {
                if (yy === archTop)
                    return ax === 2 ? C.arch : C.wall;
                return yy > floorTop - 2 ? C.archWarm : C.arch;
            }
            return xx > fx1 - 12 ? C.wallShade : C.wall;
        });
        // Silver dome
        const sd = [Math.round(w * 0.54), facadeTop - 1, Math.round(4 * s)];
        dome(sd[0], sd[1], sd[2], [C.sShade, C.sLit, C.sHi]);
        // The Green Dome with its drum and finial
        const gx = Math.round(w * 0.61), gr = Math.round(8 * s);
        rect(gx - gr, facadeTop - 2, gx + gr, facadeTop, C.drum);
        dome(gx, facadeTop - 3, gr, [C.dDeep, C.dShade, C.dMid, C.dLit, C.dHi]);
        function dome(dx, baseY, r, shades) {
            for (let y = 0; y <= r * 1.1; y++) {
                const t = y / (r * 1.1);
                const hw = Math.round(r * Math.pow(1 - t * t, 0.5) * (1 - 0.15 * t));
                for (let xx = dx - hw; xx <= dx + hw; xx++) {
                    const u = (xx - dx) / (hw + 0.5);
                    const light = 0.6 - u * 0.45 + t * 0.2 + (bayer(xx, y) - 0.5) * 0.18;
                    put(xx, baseY - y, shades[Math.max(0, Math.min(shades.length - 1, Math.floor(light * shades.length)))]);
                }
            }
            put(dx, baseY - Math.round(r * 1.1) - 1, C.gold);
            put(dx, baseY - Math.round(r * 1.1) - 2, C.gold);
        }
        // Plaza floor, projected onto the ground
        const crossing = (a, b, lines) => lines.some((l) => (a - l) * (b - l) <= 0);
        const uBands = [-1.3, -1.24, -0.36, -0.3, 0.3, 0.36, 1.24, 1.3];
        const vBands = [1.9, 1.97, 3.1, 3.2, 5.1, 5.25];
        const motifs = [[-0.8, 1.42], [0.8, 1.42], [-0.8, 2.5], [0.8, 2.5], [-0.8, 4.1], [0.8, 4.1]];
        for (let y = floorTop + 1; y < h; y++) {
            const v = toV(y), v2 = toV(y + 1);
            for (let xx = 0; xx < w; xx++) {
                const u = toU(xx, v), u2 = toU(xx + 1, v);
                let c;
                if (Math.abs(u) < 0.3) {
                    c = crossing(v, v2, [1.2, 1.4, 1.6, 1.8, 2.1, 2.4, 2.8, 3.4, 4, 4.8]) ? C.walkLine : C.walk;
                }
                else {
                    c = bayer(xx, y) < 0.3 ? C.marble2 : C.marble;
                    if (Math.floor(u * 4) !== Math.floor(u2 * 4) || Math.floor(v * 4) !== Math.floor(v2 * 4))
                        c = C.tileLine;
                    for (const [mu, mv] of motifs) {
                        const d = Math.abs(u - mu) + Math.abs(v - mv) * 1.4;
                        if (d > 0.2 && d < 0.27)
                            c = C.inlayRed;
                        else if (d > 0.34 && d < 0.39)
                            c = C.inlayDark;
                        else if (d < 0.07)
                            c = C.inlayDark;
                    }
                }
                if (crossing(u, u2, uBands) || crossing(v, v2, vBands))
                    c = C.granite;
                put(xx, y, c);
            }
        }
        // White kiosks on either side
        for (const [a, b] of [[0.09, 0.235], [0.775, 0.915]]) {
            const kx0 = Math.round(w * a), kx1 = Math.round(w * b);
            const ky1 = Math.round(h * 0.665), ky0 = ky1 - Math.round(9 * s);
            rect(kx0, ky0, kx1, ky1, (xx, yy) => {
                if (yy === ky0)
                    return C.kioskTrim;
                if (yy === ky0 + 1)
                    return C.kioskShade;
                const lx = (xx - kx0) % 6;
                if (yy >= ky0 + 3 && yy <= ky1 - 2 && lx >= 2 && lx <= 4)
                    return C.kioskWin;
                return xx > kx1 - 3 ? C.kioskShade : C.kiosk;
            });
        }
        // Base layout values for animated parts
        people = Array.from({ length: Math.round((params.people ?? 34) * s) }, (_, i) => ({
            u: -1.7 + hash(i, 1) * 3.4, v: 1.25 + hash(i, 2) * 4.2,
            du: (hash(i, 3) - 0.5) * 0.05, dv: (hash(i, 4) - 0.5) * 0.06,
            c: [C.white, C.white, C.white, C.dark, C.dark, C.brown][Math.floor(hash(i, 5) * 6)],
            head: hash(i, 6) < 0.5 ? C.skin : C.white,
        }));
    }
    let people = [];
    const posts = [];
    for (const v of [1.35, 1.95, 2.6, 3.4, 4.4, 5.6])
        posts.push([-0.45, v], [0.45, v]);
    for (const v of [1.6, 2.3, 3.1, 4.2])
        posts.push([-1.4, v], [1.4, v]);
    // World positions (u across, v distance) of the big open umbrellas, clear of the central walkway
    const UMBRELLAS = [[-1.05, 1.6], [1.45, 1.6], [-1.3, 2.7], [2.1, 2.8], [-1.45, 4.2], [2.8, 4.3]];
    const clouds = Array.from({ length: 6 }, (_, i) => ({
        x: hash(i, 71), y: 0.06 + hash(i, 72) * 0.28, len: 18 + hash(i, 73) * 30, speed: 0.5 + hash(i, 74),
    }));
    return {
        draw(_grid, t, px) {
            if (px.w !== w || px.h !== h) {
                w = px.w;
                h = px.h;
                s = h / 120;
                cx = Math.round(w * 0.5);
                yv = h * 0.525;
                D = h * 0.5;
                F = w * 0.3;
                build();
            }
            px.data.set(base);
            const wind = params.wind ?? 1;
            // Soft clouds drifting behind everything (only drawn over sky pixels)
            for (const c of clouds) {
                const span = w + c.len * 2;
                const x0 = ((c.x * span + t * c.speed * wind * 1.2) % span) - c.len;
                const y0 = c.y * h;
                for (let dy = -3; dy <= 3; dy++)
                    for (let dx = 0; dx < c.len; dx++) {
                        const nx = (dx / c.len) * 2 - 1;
                        const puff = 1 - nx * nx - (dy / 3.5) ** 2 + 0.25 * Math.sin(dx * 0.7 + c.len);
                        if (puff <= 0.05)
                            continue;
                        const X = Math.round(x0 + dx), Y = Math.round(y0 + dy);
                        if (X < 0 || Y < 0 || X >= w || Y >= h || !isSky[Y * w + X])
                            continue;
                        const k = dy > 1 ? C.cloudShade : puff > 0.5 - bayer(X, Y) * 0.3 ? C.cloud : C.cloudMid;
                        px.set(X, Y, k);
                    }
            }
            // Lamp posts and people, far to near so nearer things overlap
            const items = [];
            for (const [u, v] of posts)
                items.push({
                    v,
                    draw: () => {
                        const [bx, by] = project(u, v);
                        const hp = Math.round((0.5 * D) / v);
                        const wp = Math.max(1, Math.round(hp / 9));
                        const x0 = Math.round(bx - wp / 2), yb = Math.round(by);
                        for (let y = yb - Math.round(hp * 0.78); y <= yb; y++)
                            for (let x = x0; x < x0 + wp; x++)
                                px.set(x, y, x === x0 ? C.postLit : C.postShade);
                        for (let x = x0 - 1; x <= x0 + wp; x++)
                            px.set(x, yb, C.postBase);
                        const lampH = Math.max(2, Math.round(hp * 0.2));
                        const ly = yb - hp;
                        for (let y = ly; y < ly + lampH; y++)
                            for (let x = x0 - 1; x <= x0 + wp; x++)
                                px.set(x, y, y === ly || x === x0 - 1 || x === x0 + wp ? C.lampFrame : sunset || Math.sin(t * 2 + u * 5 + v) > 0.6 ? C.lampGlow : C.lamp);
                        px.set(Math.round(bx), ly - 1, C.lampFrame);
                    },
                });
            for (const p of people) {
                let u = p.u + p.du * t, v = p.v + p.dv * t;
                u = ((((u + 1.7) % 3.4) + 3.4) % 3.4) - 1.7;
                v = ((((v - 1.2) % 4.4) + 4.4) % 4.4) + 1.2;
                items.push({
                    v,
                    draw: () => {
                        const [bx, by] = project(u, v);
                        const hp = Math.max(2, Math.round((0.19 * D) / v));
                        const wp = Math.max(1, Math.round(hp / 5));
                        const x0 = Math.round(bx), yb = Math.round(by);
                        const step = Math.floor(t * 3 + p.u * 10) % 2;
                        for (let y = yb - hp + 1; y <= yb; y++)
                            for (let x = x0; x < x0 + wp; x++) {
                                if (y === yb && wp > 1 && (x - x0 + step) % 2 === 0)
                                    continue; // alternating steps
                                px.set(x, y, y <= yb - hp + Math.max(1, Math.round(hp / 6)) ? p.head : p.c);
                            }
                    },
                });
            }
            if (params.openUmbrellas)
                for (const [u, v] of UMBRELLAS)
                    items.push({
                        v,
                        draw: () => {
                            // The umbrellas stand well above head height, so from the plaza their canopies sit up
                            // in the sky: a wide tented membrane with ribs running down to the column, its
                            // underside glowing with the evening light.
                            const [bx, by] = project(u, v);
                            const colH = Math.round((1.45 * D) / v);
                            const half = Math.round((0.6 * F) / v);
                            const belly = Math.max(3, Math.round((0.32 * D) / v));
                            const colW = Math.max(1, Math.round(half / 9));
                            const top = Math.round(by - colH);
                            const cx0 = Math.round(bx);
                            for (let y = top + belly; y <= by; y++)
                                for (let x = cx0 - colW; x <= cx0 + colW - 1; x++)
                                    px.set(x, y, x < cx0 ? C.umbColumn : C.umbColumnShade);
                            for (let x = cx0 - half; x <= cx0 + half; x++) {
                                const k = Math.abs(x - cx0) / half; // 0 at the column, 1 at the canopy edge
                                const edgeDrop = Math.round(k * k * 2); // corners droop a little
                                const bottom = top + Math.round(belly * (1 - Math.pow(k, 0.7))); // tent narrows to the column
                                px.set(x, top + edgeDrop, C.umbCanopy);
                                for (let y = top + edgeDrop + 1; y <= Math.max(bottom, top + edgeDrop + 1); y++) {
                                    const rib = Math.round((x - cx0) * 4 / half) !== Math.round((x - cx0 + 1) * 4 / half);
                                    px.set(x, y, rib ? C.umbBellyShade : y - top < belly * 0.35 ? C.umbCanopyLit : C.umbBelly);
                                }
                            }
                        },
                    });
            items.sort((a, b) => b.v - a.v);
            for (const it of items)
                it.draw();
        },
    };
}
