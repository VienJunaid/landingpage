// Generated from rpi-dashboard/apps/web/src/renderer/webgl.ts by tools/sync-dashboard.mjs. Edit it there.
import { ATLAS_COLUMNS, buildAtlas } from './glyphs.js';
/*
 * One full-screen triangle. The fragment shader works out which cell each pixel is in,
 * looks up that cell's glyph + color in a tiny data texture, and samples the glyph atlas.
 * Per frame the CPU only uploads cols×rows×4 bytes — cheap enough for a Pi at 30–60fps.
 */
const VERT = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
const FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_cells;    // RGBA8: r = glyph, g/b = low 8 bits of fg/bg color, a = high 4 bits of each
uniform sampler2D u_atlas;    // glyphs, white on transparent
uniform sampler2D u_palette;  // 64×64 RGB (4096 colors)
uniform vec2 u_cell;          // cell size in device px
uniform float u_height;       // canvas height in device px
out vec4 outColor;

void main() {
  vec2 p = vec2(gl_FragCoord.x, u_height - gl_FragCoord.y);
  ivec2 cell = ivec2(floor(p / u_cell));
  vec4 ids = texelFetch(u_cells, cell, 0) * 255.0 + 0.5;
  int glyph = int(ids.r);
  int hi = int(ids.a);
  int fgId = int(ids.g) + ((hi >> 4) << 8);
  int bgId = int(ids.b) + ((hi & 15) << 8);
  vec3 bg = texelFetch(u_palette, ivec2(bgId % 64, bgId / 64), 0).rgb;
  if (glyph == 0) { outColor = vec4(bg, 1.0); return; }
  ivec2 local = ivec2(p - vec2(cell) * u_cell);
  ivec2 origin = ivec2(glyph % ${ATLAS_COLUMNS}, glyph / ${ATLAS_COLUMNS}) * ivec2(u_cell);
  float a = texelFetch(u_atlas, origin + local, 0).a;
  vec3 fg = texelFetch(u_palette, ivec2(fgId % 64, fgId / 64), 0).rgb;
  outColor = vec4(mix(bg, fg, a), 1.0);
}`;
function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(s) ?? 'shader error');
    return s;
}
function texture(gl, unit) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
}
function gpuName(gl) {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
}
export function createWebGLRenderer(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl)
        return undefined;
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(program) ?? 'link error');
    gl.useProgram(program);
    gl.bindVertexArray(gl.createVertexArray());
    const cellsTex = texture(gl, 0);
    const atlasTex = texture(gl, 1);
    const paletteTex = texture(gl, 2);
    gl.uniform1i(gl.getUniformLocation(program, 'u_cells'), 0);
    gl.uniform1i(gl.getUniformLocation(program, 'u_atlas'), 1);
    gl.uniform1i(gl.getUniformLocation(program, 'u_palette'), 2);
    const uCell = gl.getUniformLocation(program, 'u_cell');
    const uHeight = gl.getUniformLocation(program, 'u_height');
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    let cellW = 0, cellH = 0;
    let cells = new Uint8Array(0);
    let atlasVersion = -1, paletteVersion = -1;
    return {
        kind: 'webgl2',
        gpu: gpuName(gl),
        resize(cols, rows, cw, ch) {
            cellW = cw;
            cellH = ch;
            canvas.width = cols * cw;
            canvas.height = rows * ch;
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform2f(uCell, cw, ch);
            gl.uniform1f(uHeight, canvas.height);
            cells = new Uint8Array(cols * rows * 4);
            atlasVersion = -1;
        },
        draw(grid, glyphs, palette) {
            if (glyphs.version !== atlasVersion) {
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, atlasTex);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildAtlas(glyphs, cellW, cellH));
                atlasVersion = glyphs.version;
            }
            if (palette.version !== paletteVersion) {
                const data = new Uint8Array(64 * 64 * 3);
                palette.colors.forEach((c, i) => data.set(c, i * 3));
                gl.activeTexture(gl.TEXTURE2);
                gl.bindTexture(gl.TEXTURE_2D, paletteTex);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, 64, 64, 0, gl.RGB, gl.UNSIGNED_BYTE, data);
                paletteVersion = palette.version;
            }
            const { glyphs: g, colors: c, bgs: b } = grid;
            for (let i = 0; i < g.length; i++) {
                cells[i * 4] = g[i];
                cells[i * 4 + 1] = c[i] & 255;
                cells[i * 4 + 2] = b[i] & 255;
                cells[i * 4 + 3] = ((c[i] >> 8) << 4) | (b[i] >> 8);
            }
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, cellsTex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, grid.cols, grid.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, cells);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        },
        destroy() {
            gl.getExtension('WEBGL_lose_context')?.loseContext();
        },
    };
}
