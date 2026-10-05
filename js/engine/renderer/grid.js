// Generated from rpi-dashboard/apps/web/src/renderer/grid.ts by tools/sync-dashboard.mjs. Edit it there.
/**
 * The frame buffer: per cell a glyph id, a foreground color id and a background color id.
 * Glyph 0 is "empty"; color 0 is the theme background.
 */
export class Grid {
    cols;
    rows;
    glyphs;
    /** Color ids are 12-bit (up to 4096 colors shared by all pages). */
    colors;
    bgs;
    constructor(cols, rows) {
        this.cols = cols;
        this.rows = rows;
        this.glyphs = new Uint8Array(cols * rows);
        this.colors = new Uint16Array(cols * rows);
        this.bgs = new Uint16Array(cols * rows);
    }
    /** Empty every cell, filled with background color `bg`. */
    clear(bg = 0) {
        this.glyphs.fill(0);
        this.colors.fill(0);
        this.bgs.fill(bg);
    }
    /** Set glyph + foreground; keeps the cell's background (so text can sit on pixel art). */
    set(x, y, glyph, color) {
        if (x < 0 || y < 0 || x >= this.cols || y >= this.rows)
            return;
        const i = y * this.cols + x;
        this.glyphs[i] = glyph;
        this.colors[i] = color;
    }
    setCell(x, y, glyph, color, bg) {
        if (x < 0 || y < 0 || x >= this.cols || y >= this.rows)
            return;
        const i = y * this.cols + x;
        this.glyphs[i] = glyph;
        this.colors[i] = color;
        this.bgs[i] = bg;
    }
}
