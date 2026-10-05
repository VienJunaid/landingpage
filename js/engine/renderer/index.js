// Generated from rpi-dashboard/apps/web/src/renderer/index.ts by tools/sync-dashboard.mjs. Edit it there.
import { createCanvas2DRenderer } from './canvas2d.js';
import { createWebGLRenderer } from './webgl.js';
export function createRenderer(canvas) {
    const forced = new URLSearchParams(location.search).get('renderer');
    if (forced !== 'canvas2d') {
        try {
            const r = createWebGLRenderer(canvas);
            if (r)
                return r;
        }
        catch (err) {
            console.warn('WebGL2 renderer failed, falling back to Canvas 2D', err);
        }
    }
    return createCanvas2DRenderer(canvas);
}
export { Grid } from './grid.js';
export { GlyphSet, Palette } from './glyphs.js';
