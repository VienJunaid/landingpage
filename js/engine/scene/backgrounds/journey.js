// Generated from rpi-dashboard/apps/web/src/scene/backgrounds/journey.ts by tools/sync-dashboard.mjs. Edit it there.
import { mix } from '../../lib/color.js';
import { bayer, hash } from '../pixels.js';
const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const wrap = (v, n) => ((v % n) + n) % n;
/** A small off-screen picture (palette ids, 0 = transparent) that gets scrolled across the scene. */
class Stamp {
    w;
    h;
    data;
    constructor(w, h) {
        this.w = w;
        this.h = h;
        this.data = new Uint16Array(w * h);
    }
    set(x, y, c) {
        x = Math.round(x);
        y = Math.round(y);
        if (c && x >= 0 && y >= 0 && x < this.w && y < this.h)
            this.data[y * this.w + x] = c;
    }
    rect(x0, y0, x1, y1, c) {
        for (let y = y0; y <= y1; y++)
            for (let x = x0; x <= x1; x++)
                this.set(x, y, typeof c === 'number' ? c : c(x, y));
    }
    /** Filled ellipse; `top` keeps only the upper half (a dome). */
    ellipse(cx, cy, rx, ry, c, top = false) {
        for (let y = Math.floor(cy - ry); y <= (top ? cy : cy + ry); y++)
            for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
                if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1)
                    this.set(x, y, typeof c === 'number' ? c : c(x, y));
    }
    blit(src, x0, y0) {
        for (let y = 0; y < src.h; y++)
            for (let x = 0; x < src.w; x++)
                this.set(x0 + x, y0 + y, src.data[y * src.w + x]);
    }
}
/** The four stops, in riding order. The day runs with them: dawn, noon, sunset, night. */
const STOPS = [
    {
        name: 'aqsa',
        sky: ['#3a3470', '#b0607c', '#ffc98a'], sun: '#fff0c0', cloud: ['#ffd9b0', '#d99a9a'],
        far: ['#6a4f80', '#8a6a92'], ground: ['#d9b98c', '#cba878', '#e8cda0', '#a88860'], bird: '#3a2a4a',
    },
    {
        name: 'makkah',
        sky: ['#2f7fd6', '#7db8ee', '#dceefa'], sun: '#fffbe0', cloud: ['#ffffff', '#cfe0f2'],
        far: ['#9a7a5c', '#b8987a'], ground: ['#ecdcb8', '#e0cca0', '#f8ecd0', '#c4ac84'], bird: '#3a3a44',
    },
    {
        name: 'madinah',
        sky: ['#3a2a6a', '#d0587a', '#ffb060'], sun: '#ffd27a', cloud: ['#ffc9a0', '#c8708a'],
        far: ['#5a3458', '#7a4868'], ground: ['#e6c4b8', '#d8b0a6', '#f2d8cc', '#b08880'], bird: '#2a1a34',
    },
    {
        name: 'istanbul',
        sky: ['#070b24', '#141c4a', '#34407a'], sun: '#f4f0d8', cloud: ['#2a3466', '#1c244e'],
        far: ['#141a3a', '#1e2650'], ground: ['#3a4260', '#30385a', '#525c80', '#222840'], bird: '#0a0e20',
    },
];
const N = STOPS.length;
/**
 * The couple ride from Al-Aqsa (dawn) to Makkah (noon), Madinah (sunset) and Istanbul (night), and
 * round again. They stay in the bottom-left corner while the world scrolls right to left in layers:
 * sky and sun, far hills, the stop's landmark, roadside trees and lamps, and the ground under the
 * hooves. Each stop brings its own light, ground, birds, horses and clothes.
 *
 * The riders are drawn here (not placed by the scene) so their look can change at each stop; the
 * scene lists their assets as `hidden` characters only to have them loaded.
 */
export function journey(ctx, params = {}, characters = new Map()) {
    const id = (hex) => ctx.palette.id(hex);
    const D = params.stopSeconds ?? 30;
    const T = D * N;
    const S = params.speed ?? 14;
    const LAND = 0.45; // parallax of the landmarks
    const PROP = 0.75; // parallax of roadside trees and lamps
    const FAR = 0.2;
    const C = Object.fromEntries(Object.entries({
        wall: '#f2efe6', wallShade: '#d4cfc2', arch: '#4a4458', gold: '#e9b84a', goldDark: '#b8862a',
        kaaba: '#141217', kaabaLit: '#24212a', marble: '#e8e4d8',
        green: '#2f9a5a', greenLit: '#5ac27e', greenDark: '#1f6e40', silver: '#c4ccd4',
        brick: '#6a4a5a', brickLit: '#7e5a68', dome: '#4a5a7a', domeLit: '#6278a0', cap: '#2a3048', lit: '#ffd870',
        trunk: '#6b4a2e', frond: '#2f6a3a', frondLit: '#4a8a48', rock: '#8a7460', rockLit: '#a89078',
        post: '#3a3040', star: '#f4f0d8', window: '#ffcf6e',
    }).map(([k, v]) => [k, id(v)]));
    const stopIds = STOPS.map((s) => ({
        cloud: s.cloud.map(id), far: s.far.map(id), ground: s.ground.map(id), bird: id(s.bird),
    }));
    // ── character assets → stamps
    const fromAsset = (name, frame = 0, flip = false) => {
        const a = characters.get(name);
        if (!a?.palette)
            return undefined;
        const rows = a.frames[frame % a.frames.length];
        const w = Math.max(...rows.map((r) => r.length));
        const st = new Stamp(w, rows.length);
        rows.forEach((row, y) => Array.from(row).forEach((ch, x) => { if (a.palette[ch])
            st.set(flip ? w - 1 - x : x, y, id(a.palette[ch])); }));
        return st;
    };
    // ── landmarks, one per stop (drawn once, then scrolled)
    const minaret = (st, x, base, height, body, shade, tip) => {
        st.rect(x, base - height, x + 2, base, (px) => (px === x + 2 ? shade : body));
        for (const f of [0.45, 0.72])
            st.rect(x - 1, base - Math.round(height * f), x + 3, base - Math.round(height * f), shade); // balconies
        st.set(x + 1, base - height - 1, body);
        st.set(x + 1, base - height - 2, tip);
        st.set(x + 1, base - height - 3, tip);
    };
    const arcade = (st, x0, x1, base, height, wall, shade, arch) => {
        st.rect(x0, base - height, x1, base, (x, y) => (y === base - height ? shade : wall));
        for (let x = x0 + 2; x + 3 <= x1 - 1; x += 6) {
            st.rect(x, base - height + 4, x + 3, base, arch);
            st.set(x, base - height + 4, wall);
            st.set(x + 3, base - height + 4, wall); // rounded top
        }
    };
    function buildLandmarks() {
        // Al-Aqsa: the existing art, composed (Dome of the Rock, the Qibli mosque, a minaret, cypress and olive)
        const aqsa = new Stamp(170, 62);
        const place = (name, x) => { const s = fromAsset(name); if (s)
            aqsa.blit(s, x, aqsa.h - s.h); };
        place('cypress', 2);
        place('olive-tree', 12);
        place('dome-of-the-rock', 34);
        place('cypress', 95);
        place('al-aqsa', 104);
        place('minaret-silsila', 153);
        place('olive-tree', 76);
        // Makkah: the Kaaba in the mataf, white arcades and minarets behind it
        const makkah = new Stamp(160, 62);
        let b = makkah.h - 1;
        for (const [x, hgt] of [[8, 46], [34, 54], [118, 54], [146, 46]])
            minaret(makkah, x, b - 12, hgt, C.wall, C.wallShade, C.gold);
        arcade(makkah, 0, 159, b, 14, C.wall, C.wallShade, C.arch);
        makkah.rect(62, b - 34, 96, b, (x, y) => (y >= b - 26 && y <= b - 23 ? ((x + y) % 3 === 0 ? C.goldDark : C.gold) : x > 90 ? C.kaabaLit : C.kaaba));
        makkah.rect(84, b - 15, 89, b, (x, y) => (x === 84 || y === b - 15 ? C.goldDark : C.gold)); // the door
        makkah.rect(58, b, 100, b, C.marble);
        // Madinah: the Green Dome, white walls and slender minarets
        const madinah = new Stamp(160, 62);
        b = madinah.h - 1;
        for (const [x, hgt] of [[6, 44], [30, 52], [58, 40], [102, 40], [128, 52], [150, 44]])
            minaret(madinah, x, b - 12, hgt, C.wall, C.wallShade, C.gold);
        arcade(madinah, 0, 159, b, 13, C.wall, C.wallShade, C.arch);
        madinah.rect(66, b - 22, 96, b - 13, (x, y) => (y === b - 22 ? C.wallShade : C.wall));
        madinah.ellipse(81, b - 22, 13, 13, (x, y) => (x > 87 ? C.greenDark : x < 76 && y < b - 26 ? C.greenLit : C.green), true);
        madinah.set(81, b - 36, C.gold);
        madinah.set(81, b - 37, C.gold);
        madinah.ellipse(48, b - 13, 6, 5, C.silver, true);
        // Istanbul: Hagia Sophia by night, windows lit
        const sophia = new Stamp(150, 62);
        b = sophia.h - 1;
        for (const [x, hgt] of [[6, 50], [28, 44], [118, 44], [140, 50]])
            minaret(sophia, x, b, hgt, C.brickLit, C.brick, C.cap);
        sophia.rect(36, b - 22, 112, b, (x, y) => (y === b - 22 ? C.brickLit : (x + y) % 9 === 0 ? C.brickLit : C.brick));
        sophia.ellipse(50, b - 22, 13, 9, (x) => (x < 46 ? C.domeLit : C.dome), true);
        sophia.ellipse(98, b - 22, 13, 9, (x) => (x < 94 ? C.domeLit : C.dome), true);
        sophia.rect(56, b - 30, 92, b - 22, (x, y) => (y === b - 30 ? C.brickLit : C.brick));
        sophia.ellipse(74, b - 30, 19, 15, (x, y) => (x < 66 && y < b - 36 ? C.domeLit : C.dome), true);
        sophia.set(74, b - 46, C.gold);
        sophia.set(74, b - 47, C.gold);
        for (let x = 60; x <= 88; x += 4)
            sophia.set(x, b - 26, C.lit); // the ring of windows under the dome
        for (let x = 40; x <= 108; x += 6) {
            sophia.rect(x, b - 14, x + 1, b - 11, C.lit);
            if (x % 12 === 4)
                sophia.rect(x, b - 6, x + 1, b - 3, C.lit);
        }
        return [aqsa, makkah, madinah, sophia];
    }
    function buildProps() {
        const palm = new Stamp(15, 22);
        palm.rect(7, 8, 7, 21, C.trunk);
        for (let i = -6; i <= 6; i++) {
            palm.set(7 + i, 4 + Math.round(Math.abs(i) * 0.9), i < 0 ? C.frondLit : C.frond);
            palm.set(7 + i, 3 + Math.round(i * i * 0.12), C.frond);
        }
        palm.set(7, 2, C.frondLit);
        palm.set(7, 3, C.frond);
        const rock = new Stamp(9, 5);
        rock.ellipse(4, 4, 4, 4, (x) => (x < 4 ? C.rockLit : C.rock), true);
        const lamp = new Stamp(5, 18);
        lamp.rect(2, 4, 2, 17, C.post);
        lamp.rect(1, 1, 3, 3, C.lit);
        lamp.set(2, 0, C.post);
        const tree = (name, fallback) => fromAsset(name) ?? fallback;
        const cypress = tree('cypress', palm), olive = tree('olive-tree', rock);
        return [[cypress, olive, olive], [palm, rock, palm], [palm, palm, lamp], [cypress, lamp, lamp]];
    }
    // ── riders: four walk frames per stop, flipped to face the way they ride
    const riderFrames = (who) => STOPS.map((s) => [0, 1, 2, 3].map((f) => fromAsset(`rider-${who}-${s.name}`, f, true)));
    let landmarks = [];
    let props = [];
    let him = [];
    let her = [];
    let built = false;
    // Sky gradients are blended between stops in 12 steps; each blend's six colors are made once
    const skyCache = new Map();
    const skyStops = (a, b, step) => {
        const key = a * 1000 + b * 20 + step;
        let ids = skyCache.get(key);
        if (!ids) {
            const at = (s, f) => (f < 0.5 ? mix(s.sky[0], s.sky[1], f * 2) : mix(s.sky[1], s.sky[2], (f - 0.5) * 2));
            ids = [0, 1, 2, 3, 4, 5].map((i) => id(mix(at(STOPS[a], i / 5), at(STOPS[b], i / 5), step / 12)));
            skyCache.set(key, ids);
        }
        return ids;
    };
    const sunCache = new Map();
    const sunColor = (a, b, step) => {
        const key = a * 1000 + b * 20 + step;
        if (!sunCache.has(key))
            sunCache.set(key, id(mix(STOPS[a].sun, STOPS[b].sun, step / 12)));
        return sunCache.get(key);
    };
    /** Top of the far ridge (pixels above the horizon) at world column u, for one stop. */
    const farHeight = (stop, u) => {
        if (stop === 0)
            return 10 + 9 * noise(u * 0.03, 1) + 4 * noise(u * 0.09, 2); // soft hills
        if (stop === 1)
            return 12 + 20 * noise(u * 0.04, 5) + 6 * noise(u * 0.15, 6); // bare rocky mountains
        if (stop === 2)
            return 6 + 8 * noise(u * 0.025, 9); // low dark hills
        return 7 + Math.floor(hash(Math.floor(u / 9), 77) * 15); // a city of rooftops
    };
    const clouds = Array.from({ length: 5 }, (_, i) => ({ x: hash(i, 71), y: 0.06 + hash(i, 72) * 0.22, len: 20 + hash(i, 73) * 26 }));
    const stars = Array.from({ length: 60 }, (_, i) => ({ x: hash(i, 41), y: hash(i, 42) * 0.9, phase: hash(i, 43) * 6, order: hash(i, 44) }));
    // Each bird crosses a whole number of times per loop (3 to 5), so the loop closes on itself
    const birds = Array.from({ length: params.birds ?? 6 }, (_, i) => ({
        y: 0.18 + 0.3 * hash(i, 21), laps: 3 + Math.floor(hash(i, 22) * 3), offset: hash(i, 23), phase: hash(i, 24) * 6,
    }));
    // Everything that moves on its own clock (clouds, stars, birds) runs in whole turns per loop, so
    // the scene at T seconds is the scene at 0: a recording of one loop repeats without a jump.
    const TURN = (Math.PI * 2) / T;
    const put = (px, st, x0, y0) => {
        x0 = Math.round(x0);
        y0 = Math.round(y0);
        if (x0 >= px.w || x0 + st.w <= 0)
            return;
        for (let y = 0; y < st.h; y++)
            for (let x = 0; x < st.w; x++)
                px.set(x0 + x, y0 + y, st.data[y * st.w + x]);
    };
    return {
        draw(_grid, t, px) {
            if (!built) {
                landmarks = buildLandmarks();
                props = buildProps();
                him = riderFrames('him');
                her = riderFrames('her');
                built = true;
            }
            const w = px.w, h = px.h;
            const hz = Math.round(h * 0.6);
            const scroll = (t % T) * S;
            // Where the ride is: `tau` runs a little ahead of the clock so that a stop "starts" when its
            // ground reaches the riders (not when it reaches the left edge of the screen).
            const riderX = w * 0.26;
            const tau = wrap(t + riderX / S, T);
            const a = Math.floor(tau / D) % N;
            const b = (a + 1) % N;
            const into = tau - a * D;
            const skyBlend = Math.min(1, Math.max(0, (into - (D - 8)) / 8)); // the light changes over the last 8 s
            const step = Math.round(skyBlend * 12);
            // Sky
            const sky = skyStops(a, b, step);
            for (let y = 0; y < hz; y++) {
                const f = Math.min(0.999, y / hz) * 5;
                const i = Math.floor(f);
                for (let x = 0; x < w; x++)
                    px.data[y * w + x] = f - i > bayer(x, y) ? sky[i + 1] : sky[i];
            }
            // Stars and a crescent for the night stop
            const night = a === N - 1 ? 1 - skyBlend : b === N - 1 ? skyBlend : 0;
            if (night > 0) {
                for (const s of stars)
                    if (s.order < night && Math.sin(t * TURN * 27 + s.phase) > -0.6)
                        px.set(Math.floor(s.x * w), Math.floor(s.y * hz), C.star);
                if (night > 0.5) {
                    const mx = Math.round(w * 0.74), my = Math.round(hz * 0.26);
                    for (let dy = -5; dy <= 5; dy++)
                        for (let dx = -5; dx <= 5; dx++)
                            if (dx * dx + dy * dy <= 25 && (dx - 2.5) ** 2 + (dy + 1) ** 2 > 20)
                                px.set(mx + dx, my + dy, C.star);
                }
            }
            // The sun rises at Al-Aqsa, stands high over Makkah and sets behind Madinah
            const day = tau / (D * (N - 1));
            if (day < 1.03) {
                const sx = Math.round(w * (0.9 - 0.36 * day)), sy = Math.round(hz + 5 - Math.sin(Math.min(1, day) * Math.PI) * hz * 0.84 + Math.max(0, day - 1) * 200);
                const col = sunColor(a, b, step);
                for (let dy = -5; dy <= 5; dy++)
                    for (let dx = -5; dx <= 5; dx++)
                        if (dx * dx + dy * dy <= 27 && sy + dy < hz)
                            px.set(sx + dx, sy + dy, col);
            }
            // Clouds, drifting back slowly: each crosses the sky exactly once per loop
            const cl = stopIds[skyBlend > 0.5 ? b : a].cloud;
            for (const c of clouds) {
                const span = w + c.len * 2;
                const x0 = wrap(c.x * span - ((t % T) / T) * span, span) - c.len;
                for (let dy = -3; dy <= 2; dy++)
                    for (let dx = 0; dx < c.len; dx++) {
                        const nx = (dx / c.len) * 2 - 1;
                        const puff = 1 - nx * nx - (dy / 3) ** 2 + 0.3 * Math.sin(dx * 0.5 + c.len);
                        if (puff > 0.05)
                            px.set(Math.round(x0 + dx), Math.round(c.y * hz + dy), dy > 0 ? cl[1] : cl[0]);
                    }
            }
            // Far ridge: one stop's hills dissolve into the next as the light changes
            const farPeriod = S * T * FAR;
            for (let x = 0; x < w; x++) {
                const u = wrap(x + scroll * FAR, farPeriod);
                const ha = farHeight(a, u), hb = farHeight(b, u);
                for (let y = hz - Math.ceil(Math.max(ha, hb)); y < hz; y++) {
                    const stop = hash(x, y) < skyBlend ? b : a;
                    const top = hz - (stop === a ? ha : hb);
                    if (y < top)
                        continue;
                    let c = y - top < 1 ? stopIds[stop].far[1] : stopIds[stop].far[0];
                    if (stop === N - 1 && Math.floor(u) % 3 === 1 && y % 3 === 0 && y > top + 1 && hash(Math.floor(u / 3), y) < 0.35)
                        c = C.window;
                    px.set(x, y, c);
                }
            }
            // Ground: nearer rows scroll faster and their paving is wider, so it reads as depth
            const span = S * D;
            for (let y = hz; y < h; y++) {
                const depth = (y - hz) / (h - hz);
                const par = 0.55 + 0.45 * depth;
                const row = y - hz;
                for (let x = 0; x < w; x++) {
                    const tx = wrap(x / par + scroll, S * T);
                    // Which ground: decided at full speed on every row, so the change sweeps in as one upright,
                    // ragged edge (deciding it per row made a diagonal that cut across the paving)
                    const gx = wrap(x + scroll, S * T);
                    let stop = Math.floor(gx / span) % N;
                    const local = gx - stop * span;
                    if (local < 10 && hash(Math.floor(gx), row) > local / 10)
                        stop = (stop + N - 1) % N;
                    const g = stopIds[stop].ground;
                    const ix = Math.floor(tx);
                    let c = g[0];
                    if (stop === 0) { // worn stone slabs
                        const course = Math.floor(row / 6);
                        c = row % 6 === 0 || wrap(ix + (course % 2) * 7, 14) === 0 ? g[3] : hash(Math.floor((ix + (course % 2) * 7) / 14), course) < 0.4 ? g[1] : hash(ix, row) < 0.05 ? g[2] : g[0];
                    }
                    else if (stop === 1) { // rippled sand
                        const n = noise(tx * 0.05, row * 0.35);
                        c = n > 0.62 ? g[2] : n < 0.36 ? g[1] : hash(ix, row) < 0.04 ? g[3] : g[0];
                    }
                    else if (stop === 2) { // polished two-tone tiles
                        c = row % 5 === 0 || ix % 10 === 0 ? g[3] : (Math.floor(ix / 10) + Math.floor(row / 5)) % 2 ? g[1] : g[0];
                    }
                    else { // cobbles under lamplight
                        const cx = Math.floor((ix + (Math.floor(row / 3) % 2) * 2) / 4), cy = Math.floor(row / 3);
                        c = row % 3 === 0 ? g[3] : hash(cx, cy) < 0.3 ? g[1] : hash(cx, cy) > 0.93 ? g[2] : g[0];
                    }
                    if (row < 2)
                        c = g[1];
                    px.data[y * w + x] = c;
                }
            }
            // Landmarks: each stop's building drifts past, centred while the riders are mid-stop
            const landPeriod = S * T * LAND;
            for (let k = 0; k < N; k++) {
                const st = landmarks[k];
                if (!st)
                    continue;
                const centre = w / 2 + (k * D + D / 2 - riderX / S) * S * LAND;
                const x = wrap(centre - scroll * LAND + st.w, landPeriod) - st.w - st.w / 2;
                put(px, st, x, hz + 4 - st.h);
                put(px, st, x + landPeriod, hz + 4 - st.h);
            }
            // Roadside trees, rocks and lamps
            const cell = 38, propPeriod = S * T * PROP, cells = Math.round(propPeriod / cell);
            for (let i = Math.floor((scroll * PROP) / cell) - 1; i <= (scroll * PROP + w) / cell + 1; i++) {
                const k = wrap(i, cells);
                if (hash(k, 3) < 0.3)
                    continue;
                const stop = Math.floor((k * cell) / (S * D * PROP)) % N;
                const st = props[stop][Math.floor(hash(k, 5) * props[stop].length)];
                put(px, st, i * cell + hash(k, 7) * 14 - scroll * PROP, hz + 9 - st.h);
            }
            // Birds, by day
            if (night < 0.5) {
                const bird = stopIds[skyBlend > 0.5 ? b : a].bird;
                for (const bd of birds) {
                    const x = Math.floor(w - wrap((bd.offset + ((t % T) / T) * bd.laps) * (w + 30), w + 30) + 10);
                    const y = Math.floor(bd.y * hz + Math.sin(t * TURN * 15 + bd.phase) * 2);
                    const up = Math.floor(t * 5 + bd.phase) % 2 === 0;
                    px.set(x, y, bird);
                    px.set(x - 1, up ? y - 1 : y + 1, bird);
                    px.set(x + 1, up ? y - 1 : y + 1, bird);
                }
            }
            // The riders, bottom left. Their look dissolves into the next stop's as its ground reaches them.
            const change = Math.min(1, Math.max(0, (into - (D - 2)) / 2));
            const frame = Math.floor(t * 5) % 4;
            const rider = (set, cx, base) => {
                const now = set[a][frame], next = set[b][frame];
                if (!now)
                    return;
                const x0 = Math.round(cx - now.w / 2), y0 = base - now.h;
                for (let y = 0; y < now.h; y++)
                    for (let x = 0; x < now.w; x++) {
                        const src = next && hash(x, y) < change ? next : now;
                        px.set(x0 + x, y0 + y, src.data[y * src.w + x]);
                    }
            };
            // Placed for a 16:9 screen (192 px wide). A narrower one, like a phone held upright, is a centre
            // crop: keep each horse whole while there is room, and below that put her in the middle with him
            // just behind, so both riders stay in view even though the horses run off the edges.
            const room = w >= 104;
            const himX = room ? Math.max(30, w * 0.17) : w / 2 - 16;
            const herX = room ? Math.max(himX + 34, w * 0.36) : w / 2 + 4;
            rider(him, himX, h - 5);
            rider(her, herX, h);
        },
    };
}
