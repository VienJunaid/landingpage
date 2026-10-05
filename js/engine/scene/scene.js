// Generated from rpi-dashboard/apps/web/src/scene/scene.ts by tools/sync-dashboard.mjs. Edit it there.
import { GlyphSet, Palette } from '../renderer/glyphs.js';
import { createBackground } from './backgrounds/index.js';
import { createSprite } from './characters.js';
import { PixelLayer } from './pixels.js';
/**
 * Composes each frame:
 *   background → pixel-art sprites → fold pixels into cells → ASCII sprites → overlay
 * so ASCII text can sit on top of pixel art (it keeps the cell's background color).
 */
export function createScene(scene, theme, assets, 
// Scenes on different pages share glyph + color ids so they can be blended in transitions.
shared = { glyphs: new GlyphSet(), palette: new Palette(theme.background) }) {
    const ctx = { ...shared, theme };
    const bg = ctx.palette.id(theme.background);
    const pixels = new PixelLayer(ctx.glyphs);
    const background = createBackground(ctx, assets.background);
    const sprites = scene.characters.flatMap((cfg) => {
        const asset = assets.characters.get(cfg.asset);
        if (!asset) {
            console.warn(`Character "${cfg.asset}" not found in assets/characters/`);
            return [];
        }
        return [createSprite(ctx, asset, cfg)];
    });
    const pixelSprites = sprites.filter((s) => s.kind === 'pixel');
    const asciiSprites = sprites.filter((s) => s.kind === 'ascii');
    return {
        glyphs: ctx.glyphs,
        palette: ctx.palette,
        draw(grid, t) {
            grid.clear(bg);
            pixels.resize(grid.cols, grid.rows);
            pixels.clear();
            background.draw(grid, t, pixels);
            for (const s of pixelSprites)
                s.draw(grid, t, pixels);
            pixels.resolve(grid);
            for (const s of asciiSprites)
                s.draw(grid, t, pixels);
            background.overlay?.(grid, t);
        },
    };
}
