// Generated from rpi-dashboard/apps/web/src/renderer/canvas2d.ts by tools/sync-dashboard.mjs. Edit it there.
import { rgbToHex } from '../lib/color.js';
import { ATLAS_COLUMNS, buildAtlas } from './glyphs.js';
/**
 * Fallback when WebGL2 is unavailable (e.g. GPU blocklisted). Keeps one tinted atlas per
 * color and only redraws cells that changed since the last frame.
 */
export function createCanvas2DRenderer(canvas) {
    const ctx = canvas.getContext('2d', { alpha: false });
    let cellW = 0, cellH = 0;
    let prevGlyphs = new Uint8Array(0);
    let prevColors = new Uint16Array(0);
    let prevBgs = new Uint16Array(0);
    let atlas;
    let atlasVersion = -1, paletteVersion = -1;
    const tinted = new Map();
    const tint = (colorId, palette) => {
        let t = tinted.get(colorId);
        if (t)
            return t;
        t = document.createElement('canvas');
        t.width = atlas.width;
        t.height = atlas.height;
        const c = t.getContext('2d');
        c.drawImage(atlas, 0, 0);
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = rgbToHex(palette.colors[colorId] ?? [255, 255, 255]);
        c.fillRect(0, 0, t.width, t.height);
        tinted.set(colorId, t);
        return t;
    };
    const invalidate = () => {
        prevGlyphs.fill(255);
        tinted.clear();
    };
    return {
        kind: 'canvas2d',
        resize(cols, rows, cw, ch) {
            cellW = cw;
            cellH = ch;
            canvas.width = cols * cw;
            canvas.height = rows * ch;
            prevGlyphs = new Uint8Array(cols * rows);
            prevColors = new Uint16Array(cols * rows);
            prevBgs = new Uint16Array(cols * rows);
            atlasVersion = -1;
        },
        draw(grid, glyphs, palette) {
            if (glyphs.version !== atlasVersion || palette.version !== paletteVersion) {
                atlas = buildAtlas(glyphs, cellW, cellH);
                atlasVersion = glyphs.version;
                paletteVersion = palette.version;
                invalidate();
            }
            const hex = palette.colors.map(rgbToHex);
            for (let i = 0; i < grid.glyphs.length; i++) {
                const g = grid.glyphs[i], c = grid.colors[i], b = grid.bgs[i];
                if (g === prevGlyphs[i] && c === prevColors[i] && b === prevBgs[i])
                    continue;
                prevGlyphs[i] = g;
                prevColors[i] = c;
                prevBgs[i] = b;
                const x = (i % grid.cols) * cellW;
                const y = Math.floor(i / grid.cols) * cellH;
                ctx.fillStyle = hex[b] ?? hex[0];
                ctx.fillRect(x, y, cellW, cellH);
                if (g === 0)
                    continue;
                const sx = (g % ATLAS_COLUMNS) * cellW;
                const sy = Math.floor(g / ATLAS_COLUMNS) * cellH;
                ctx.drawImage(tint(c, palette), sx, sy, cellW, cellH, x, y, cellW, cellH);
            }
        },
        destroy() { },
    };
}
