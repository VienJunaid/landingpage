// Generated from rpi-dashboard/apps/web/src/widgets/clock/digits.ts by tools/sync-dashboard.mjs. Edit it there.
// 3×3 block font for the big clock.
const FONT = {
    '0': ['█▀█', '█ █', '▀▀▀'],
    '1': ['▄█ ', ' █ ', '▄█▄'],
    '2': ['▀▀█', '█▀▀', '▀▀▀'],
    '3': ['▀▀█', ' ▀█', '▀▀▀'],
    '4': ['█ █', '▀▀█', '  ▀'],
    '5': ['█▀▀', '▀▀█', '▀▀▀'],
    '6': ['█▀▀', '█▀█', '▀▀▀'],
    '7': ['▀▀█', '  █', '  ▀'],
    '8': ['█▀█', '█▀█', '▀▀▀'],
    '9': ['█▀█', '▀▀█', '▀▀▀'],
    ':': [' ', '▀', '▀'],
    ' ': [' ', ' ', ' '],
};
export function bigText(text) {
    const glyphs = [...text].map((ch) => FONT[ch] ?? FONT[' ']);
    return [0, 1, 2].map((row) => glyphs.map((g) => g[row]).join(' ')).join('\n');
}
