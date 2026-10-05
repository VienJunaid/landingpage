// Generated from rpi-dashboard/apps/web/src/scene/backgrounds/index.ts by tools/sync-dashboard.mjs. Edit it there.
import { farooq } from './farooq.js';
import { farooqNight } from './farooqNight.js';
import { frames } from './frames.js';
import { haram } from './haram.js';
import { kaaba } from './kaaba.js';
import { madinah } from './madinah.js';
import { meadow } from './meadow.js';
import { sophia } from './sophia.js';
import { sunset } from './sunset.js';
import { water } from './water.js';
/** Procedural effects by name. Add new ones here (e.g. rain, sand, aurora). */
const EFFECTS = {
    water,
    sunset,
    haram,
    kaaba,
    sophia,
    madinah,
    farooq,
    farooqNight,
    meadow,
    none: () => ({ draw() { } }),
};
export function createBackground(ctx, asset) {
    if (!asset)
        return EFFECTS.none(ctx, {});
    if (asset.type === 'frames')
        return frames(ctx, asset);
    const effect = EFFECTS[asset.effect];
    if (!effect) {
        console.warn(`Unknown background effect "${asset.effect}"`);
        return EFFECTS.none(ctx, {});
    }
    return effect(ctx, asset.params ?? {});
}
