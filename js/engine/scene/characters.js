// Generated from rpi-dashboard/apps/web/src/scene/characters.ts by tools/sync-dashboard.mjs. Edit it there.
import { mix } from '../lib/color.js';
import { resolveColor } from '../lib/theme.js';
const frameAt = (frames, fps, t) => frames[Math.floor(Math.max(0, t) * fps) % frames.length];
function origin(cfg, areaW, areaH, w, h) {
    let x = Math.round(cfg.x * areaW);
    let y = Math.round(cfg.y * areaH);
    const anchor = cfg.anchor ?? 'top-left';
    if (anchor.endsWith('center') || anchor === 'center')
        x -= Math.floor(w / 2);
    if (anchor.startsWith('bottom'))
        y -= h;
    if (anchor === 'center')
        y -= Math.floor(h / 2);
    return [x, y];
}
export function createSprite(ctx, asset, cfg) {
    return asset.palette ? pixelSprite(ctx, asset, cfg) : asciiSprite(ctx, asset, cfg);
}
// ---------------------------------------------------------------- pixel art
function pixelSprite(ctx, asset, cfg) {
    const ids = {};
    for (const [key, hex] of Object.entries(asset.palette))
        ids[key] = ctx.palette.id(hex);
    const fps = asset.fps ?? 1;
    const frames = asset.frames.map((rows) => {
        const w = Math.max(...rows.map((r) => Array.from(r).length));
        const h = rows.length;
        const data = new Uint16Array(w * h);
        rows.forEach((row, y) => Array.from(row).forEach((ch, x) => {
            const id = ids[ch];
            if (id)
                data[y * w + (cfg.flip ? w - 1 - x : x)] = id;
        }));
        return { w, h, data };
    });
    return {
        kind: 'pixel',
        draw(_grid, t, px) {
            const f = frameAt(frames, fps, t);
            const [x0, y0] = origin(cfg, px.w, px.h, f.w, f.h);
            for (let y = 0; y < f.h; y++)
                for (let x = 0; x < f.w; x++) {
                    const c = f.data[y * f.w + x];
                    if (c)
                        px.set(x0 + x, y0 + y, c);
                }
        },
    };
}
// ---------------------------------------------------------------- ASCII art
const MIRROR = {
    '/': '\\', '\\': '/', '^': 'v', v: '^', '.': "'", "'": '.', ',': '`', '`': ',',
    '▀': '▄', '▄': '▀', '(': '(', ')': ')', '_': '‾', '‾': '_',
};
const FLIP = { '/': '\\', '\\': '/', '(': ')', ')': '(', '[': ']', ']': '[', '<': '>', '>': '<', '▌': '▐', '▐': '▌' };
/** Spaces enclosed by the outline (not reachable from the edge) become opaque. */
function enclosed(cells, w, h, transparent) {
    const empty = (x, y) => {
        const ch = cells[y]?.[x] ?? ' ';
        return ch === ' ' || ch === transparent;
    };
    const outside = new Uint8Array(w * h);
    const stack = [];
    for (let x = 0; x < w; x++)
        stack.push([x, 0], [x, h - 1]);
    for (let y = 0; y < h; y++)
        stack.push([0, y], [w - 1, y]);
    while (stack.length) {
        const [x, y] = stack.pop();
        if (x < 0 || y < 0 || x >= w || y >= h || outside[y * w + x] || !empty(x, y))
            continue;
        outside[y * w + x] = 1;
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    const opaque = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++)
        opaque[i] = outside[i] ? 0 : 1;
    return opaque;
}
function asciiSprite(ctx, asset, cfg) {
    const { glyphs, palette, theme } = ctx;
    const transparent = asset.transparent ?? ' ';
    const color = resolveColor(theme, cfg.color ?? asset.color, theme.foreground);
    const colorId = palette.id(color);
    const reflectId = palette.id(mix(theme.background, color, 0.4));
    const fps = asset.fps ?? 1;
    const frames = asset.frames.map((rows) => {
        let cells = rows.map((r) => Array.from(r));
        const w = Math.max(...cells.map((r) => r.length));
        if (cfg.flip)
            cells = cells.map((r) => [...r, ...Array(w - r.length).fill(' ')].reverse().map((ch) => FLIP[ch] ?? ch));
        const h = cells.length;
        const ids = new Uint8Array(w * h);
        const mirrored = new Uint8Array(w * h);
        const opaque = asset.solid ? enclosed(cells, w, h, transparent) : new Uint8Array(w * h);
        cells.forEach((row, y) => row.forEach((ch, x) => {
            if (ch === transparent || ch === ' ')
                return;
            ids[y * w + x] = glyphs.id(ch);
            mirrored[y * w + x] = glyphs.id(MIRROR[ch] ?? ch);
        }));
        return { w, h, ids, mirrored, opaque };
    });
    return {
        kind: 'ascii',
        draw(grid, t) {
            const f = frameAt(frames, fps, t);
            const [x0, y0] = origin(cfg, grid.cols, grid.rows, f.w, f.h);
            for (let y = 0; y < f.h; y++)
                for (let x = 0; x < f.w; x++) {
                    const i = y * f.w + x;
                    if (f.ids[i])
                        grid.set(x0 + x, y0 + y, f.ids[i], colorId);
                    else if (f.opaque[i])
                        grid.set(x0 + x, y0 + y, 0, 0);
                }
            // Broken, rippling reflection below the sprite (sits on top of the water).
            if (cfg.reflect) {
                const top = y0 + f.h + 1; // skip the horizon line
                for (let r = 0; r < f.h; r++) {
                    const src = f.h - 1 - r;
                    const dx = Math.round(Math.sin(t * 1.8 + r * 0.9) * (0.4 + r * 0.25));
                    for (let x = 0; x < f.w; x++) {
                        const id = f.mirrored[src * f.w + x];
                        if (!id || Math.sin(x * 1.7 + r * 2.3 + t * 2.5) > 0.55)
                            continue;
                        grid.set(x0 + x + dx, top + r, id, reflectId);
                    }
                }
            }
        },
    };
}
