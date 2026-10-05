// Generated from rpi-dashboard/apps/web/src/renderer/glyphs.ts by tools/sync-dashboard.mjs. Edit it there.
import { hexToRgb } from '../lib/color.js';
const MAX_GLYPHS = 256; // glyph ids are 8-bit
const MAX_COLORS = 4096; // color ids are 12-bit
/** Maps characters ↔ small integer ids so the grid can store them in a Uint8Array. */
export class GlyphSet {
    chars = [' '];
    ids = new Map([[' ', 0]]);
    version = 0;
    id(ch) {
        let id = this.ids.get(ch);
        if (id !== undefined)
            return id;
        if (this.chars.length >= MAX_GLYPHS)
            return this.ids.get('?') ?? 0;
        id = this.chars.length;
        this.chars.push(ch);
        this.ids.set(ch, id);
        this.version++;
        return id;
    }
    /** Split a string into glyph ids (handles multi-byte characters). */
    split(text) {
        return Array.from(text, (ch) => this.id(ch));
    }
}
/** Maps hex colors ↔ palette indices. Index 0 is the background color. */
export class Palette {
    colors;
    ids = new Map();
    version = 0;
    constructor(background) {
        this.colors = [hexToRgb(background)];
        this.ids.set(background.toLowerCase(), 0);
    }
    id(hex) {
        const key = hex.toLowerCase();
        let id = this.ids.get(key);
        if (id !== undefined)
            return id;
        if (this.colors.length >= MAX_COLORS) {
            console.warn('Palette full (4096 colors); reusing color 1');
            return 1;
        }
        id = this.colors.length;
        this.colors.push(hexToRgb(key));
        this.ids.set(key, id);
        this.version++;
        return id;
    }
}
export const ATLAS_COLUMNS = 16;
export const FONT_FAMILY = '"JetBrains Mono", "CaskaydiaMono Nerd Font", ui-monospace, monospace';
/**
 * Draw every glyph once, white on transparent, into a 16-column atlas.
 * The renderers tint and stamp from this — no per-frame text rendering.
 */
export function buildAtlas(glyphs, cellW, cellH) {
    const rows = Math.ceil(glyphs.chars.length / ATLAS_COLUMNS);
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_COLUMNS * cellW;
    canvas.height = Math.max(1, rows) * cellH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(cellH * 0.8)}px ${FONT_FAMILY}`;
    glyphs.chars.forEach((ch, i) => {
        if (i === 0)
            return;
        const x = (i % ATLAS_COLUMNS) * cellW;
        const y = Math.floor(i / ATLAS_COLUMNS) * cellH;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, cellW, cellH);
        ctx.clip();
        // Block elements fill exact integer pixel rects so half-block "pixels" tile seamlessly.
        const top = Math.floor(cellH / 2), left = Math.floor(cellW / 2);
        const blocks = {
            '█': [0, 0, cellW, cellH], '▀': [0, 0, cellW, top], '▄': [0, top, cellW, cellH - top],
            '▌': [0, 0, left, cellH], '▐': [left, 0, cellW - left, cellH],
        };
        const b = blocks[ch];
        if (b)
            ctx.fillRect(x + b[0], y + b[1], b[2], b[3]);
        else
            ctx.fillText(ch, x + cellW / 2, y + cellH / 2 + cellH * 0.04);
        ctx.restore();
    });
    return canvas;
}
