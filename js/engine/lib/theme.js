// Generated from rpi-dashboard/apps/web/src/lib/theme.ts by tools/sync-dashboard.mjs. Edit it there.
const TOKENS = ['background', 'foreground', 'accent', 'muted', 'verse'];
const CSS_NAMES = {
    background: '--bg', foreground: '--fg', accent: '--accent', muted: '--muted', verse: '--verse',
};
export function applyTheme(theme) {
    const root = document.documentElement.style;
    for (const t of TOKENS)
        root.setProperty(CSS_NAMES[t], theme[t]);
}
/** Resolve a sprite color: theme token ("accent", "fg"), extra theme color ("gold"), or hex. */
export function resolveColor(theme, value, fallback) {
    if (!value)
        return fallback;
    if (value.startsWith('#'))
        return value;
    const aliases = {
        fg: theme.foreground, foreground: theme.foreground, accent: theme.accent,
        muted: theme.muted, verse: theme.verse, bg: theme.background, background: theme.background,
    };
    return aliases[value] ?? theme.colors?.[value] ?? fallback;
}
