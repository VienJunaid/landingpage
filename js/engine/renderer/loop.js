// Generated from rpi-dashboard/apps/web/src/renderer/loop.ts by tools/sync-dashboard.mjs. Edit it there.
/**
 * requestAnimationFrame loop capped at `fps`. Calls `frame(seconds)`.
 * While paused it asks for no frames at all: an idle rAF still wakes the browser 60 times a second.
 */
export function startLoop(fps, frame) {
    const interval = 1000 / fps;
    let last = 0;
    let handle = 0;
    let paused = false;
    const start = performance.now();
    const tick = (now) => {
        handle = requestAnimationFrame(tick);
        if (now - last < interval - 1)
            return;
        last = now;
        frame(Math.max(0, now - start) / 1000); // rAF timestamps can precede `start`
    };
    handle = requestAnimationFrame(tick);
    return {
        stop: () => cancelAnimationFrame(handle),
        setPaused(p) {
            if (p === paused)
                return;
            paused = p;
            cancelAnimationFrame(handle);
            if (!p)
                handle = requestAnimationFrame(tick);
        },
    };
}
