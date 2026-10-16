/**
 * A WebGL 2 context that draws nothing and records what it's asked, for checking Three.js layers
 * headless (there's no browser or GPU on the server): the real Three.js runs on it, and what reaches
 * the GL is kept for the test to look at.
 *
 * - Every draw: the program, the framebuffer it went to (with its attachments' formats), the
 *   viewport, the scissor box (null with the scissor test off), depth test and write, blending, and
 *   which texture each of the program's samplers read; `problems` lists a draw that reads a texture
 *   its own framebuffer writes (a feedback loop: a real GL refuses the draw).
 * - Every clear, with the same state.
 * - Each texture's format and size, and the bytes last uploaded to all of it (a sprite's picture).
 * - Shaders are compiled for real only as far as a test can without a GLSL compiler: preprocessed
 *   (#define, #if/#ifdef...), then checked for what would stop a GL compiling or linking them:
 *   the version line, a default float precision in fragment shaders, keywords GLSL ES 3.00 doesn't
 *   have left over (`attribute`, `varying`, `texture2D`, `gl_FragColor`), a function defined twice
 *   (a name of ours that the shader's prefix already has), a reserved word as a name, our
 *   uniforms and varyings (`uName`, `vName`) used without being declared, and at link a fragment
 *   input with no vertex output of the same type, or a uniform declared with two types. The
 *   program's active uniforms and attributes are the ones declared and used, so Three.js sets
 *   them as on a real GL (the values are kept per program).
 * - Options make it act like a weaker GL: no float colour buffers (`noFloatTargets`: half-float
 *   framebuffers incomplete), or a shader that won't compile (`breakShader`).
 */

export interface StubOptions {
  /** As a GL without EXT_color_buffer_float/half_float: framebuffers with a float colour buffer are incomplete. */
  noFloatTargets?: boolean;
  /** Shaders whose source matches this fail to compile. */
  breakShader?: RegExp;
  /** Drawing with a program that has this uniform throws (as a GL call failing would). */
  throwOnDraw?: string;
}

/** A texture: its format and size, and the bytes last uploaded to all of it (`flipY`: the GL told to turn them upside down), if any. */
export interface GlTexture { id: number; format: string; w: number; h: number; upload?: { data: Uint8Array; flipY: boolean } }
export interface GlFramebuffer { id: number; colour: GlTexture | null; depth: GlTexture | null }
export interface GlShader { id: number; vertex: boolean; source: string; errors: string[]; decls: Decls }
export interface GlProgram {
  id: number; shaders: GlShader[]; linked: boolean; log: string;
  uniforms: { name: string; type: string; size: number }[];
  attributes: { name: string; type: string }[];
  /** The values its uniforms were last given (samplers: the texture unit). */
  values: Map<string, unknown>;
}
interface State { framebuffer: GlFramebuffer | null; viewport: number[]; scissor: number[] | null; depthTest: boolean; depthMask: boolean; blend: boolean }
export interface GlDraw extends State { program: GlProgram; count: number; instances: number; samples: Map<string, GlTexture | null>; values: Map<string, unknown> }
export interface GlClear extends State { colour: boolean; depth: boolean }

/** The stand-in context and what it recorded. */
export class GlStub {
  readonly draws: GlDraw[] = [];
  readonly clears: GlClear[] = [];
  readonly programs: GlProgram[] = [];
  readonly problems: string[] = [];
  /** The context to give Three.js (`new WebGLRenderer({ canvas, context })`, or a canvas's getContext). */
  readonly context: object;
  private ids = 1;
  private fb: GlFramebuffer | null = null;
  private program: GlProgram | null = null;
  private unit = 0;
  private readonly units = new Map<number, GlTexture>();
  private readonly enabled = new Set<string>();
  private viewport = [0, 0, 1, 1];
  private scissorBox = [0, 0, 1, 1];
  private depthMask = true;
  private flipY = false;

  constructor(private readonly width: number, private readonly height: number, private readonly options: StubOptions = {}) {
    this.viewport = [0, 0, width, height];
    this.scissorBox = [0, 0, width, height];
    const impl = this.methods();
    const handler: ProxyHandler<Record<string, unknown>> = {
      get: (target, prop) => {
        if (typeof prop !== 'string') return undefined;
        if (prop in target) return target[prop];
        if (/^[A-Z][A-Z0-9_]*$/.test(prop)) return constant(prop);
        return () => undefined; // (everything else: done, nothing to show)
      },
      has: () => true,
    };
    this.context = new Proxy<Record<string, unknown>>(impl, handler);
  }

  /** Forget what was recorded (keeps the GL's objects and state). */
  reset() { this.draws.length = 0; this.clears.length = 0; this.problems.length = 0; }

  private state(): State {
    return { framebuffer: this.fb, viewport: [...this.viewport], scissor: this.enabled.has('SCISSOR_TEST') ? [...this.scissorBox] : null, depthTest: this.enabled.has('DEPTH_TEST'), depthMask: this.depthMask, blend: this.enabled.has('BLEND') };
  }

  private draw(count: number, instances = 1) {
    const program = this.program;
    if (!program) { this.problems.push('a draw with no program'); return; }
    if (!program.linked) this.problems.push(`a draw with program ${program.id}, which didn't link`);
    const fail = this.options.throwOnDraw;
    if (fail && program.uniforms.some((u) => u.name === fail)) throw new Error(`a draw failed (the stand-in was asked to fail drawing with ${fail})`);
    const samples = new Map<string, GlTexture | null>();
    for (const u of program.uniforms) {
      if (!u.type.startsWith('sampler')) continue;
      const unit = program.values.get(u.name), tex = typeof unit === 'number' ? this.units.get(unit) ?? null : null;
      samples.set(u.name, tex);
      if (tex && this.fb && (tex === this.fb.colour || tex === this.fb.depth)) this.problems.push(`program ${program.id} reads ${u.name} (texture ${tex.id}) while drawing into it (framebuffer ${this.fb.id})`);
    }
    this.draws.push({ ...this.state(), program, count, instances, samples, values: new Map(program.values) });
  }

  private methods(): Record<string, unknown> {
    const s = this;
    const textures = new Map<number, GlTexture>(); // (by object id)
    const texOf = (o: unknown) => (isObj(o) && typeof o.id === 'number' ? textures.get(o.id) ?? null : null);
    const framebuffers = new Map<number, GlFramebuffer>();
    const shaders = new Map<number, GlShader>();
    const programOf = (o: unknown) => (isObj(o) && typeof o.id === 'number' ? s.programs.find((p) => p.id === o.id) ?? null : null);
    const setUniform = (loc: unknown, v: unknown) => {
      if (!isObj(loc) || typeof loc.name !== 'string') return;
      const p = programOf(loc.program);
      p?.values.set(loc.name, ArrayBuffer.isView(v) ? Array.from(numbers(v)) : v);
    };
    const uniform = (loc: unknown, ...v: unknown[]) => setUniform(loc, v.length === 1 ? v[0] : v);
    const named = (v: unknown) => (typeof v === 'number' ? constantName(v) : '');
    return {
      canvas: null,
      drawingBufferWidth: s.width, drawingBufferHeight: s.height,
      getContextAttributes: () => ({ alpha: false, antialias: false, depth: true, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'default', failIfMajorPerformanceCaveat: false }),
      isContextLost: () => false,
      getError: () => 0,
      getSupportedExtensions: () => [],
      getExtension: (name: string) => (s.options.noFloatTargets && /color_buffer_(half_)?float/.test(name) ? null : new Proxy<Record<string, unknown>>({}, { get: (_t, p) => (typeof p === 'string' && /^[A-Z]/.test(p) ? constant(p) : () => undefined) })),
      getShaderPrecisionFormat: () => ({ precision: 23, rangeMin: 127, rangeMax: 127 }),
      getParameter: (p: number) => {
        const n = constantName(p);
        if (n === 'VERSION') return 'WebGL 2.0 (stand-in)';
        if (n === 'SHADING_LANGUAGE_VERSION') return 'WebGL GLSL ES 3.00 (stand-in)';
        if (n === 'SCISSOR_BOX' || n === 'VIEWPORT') return new Int32Array([0, 0, s.width, s.height]);
        if (n === 'MAX_TEXTURE_SIZE' || n === 'MAX_CUBE_MAP_TEXTURE_SIZE' || n === 'MAX_RENDERBUFFER_SIZE') return 8192;
        if (n === 'MAX_VERTEX_UNIFORM_VECTORS' || n === 'MAX_FRAGMENT_UNIFORM_VECTORS') return 1024;
        if (n === 'MAX_SAMPLES') return 4;
        if (n.startsWith('MAX_')) return 16;
        return 0;
      },
      createTexture: () => { const t = { id: s.ids++, format: '', w: 0, h: 0 }; textures.set(t.id, t); return { id: t.id }; },
      createFramebuffer: () => { const f = { id: s.ids++, colour: null, depth: null }; framebuffers.set(f.id, f); return { id: f.id }; },
      createBuffer: () => ({ id: s.ids++ }), createRenderbuffer: () => ({ id: s.ids++ }), createVertexArray: () => ({ id: s.ids++ }),
      activeTexture: (u: number) => { s.unit = u - constant('TEXTURE0'); },
      bindTexture: (_target: number, t: unknown) => { const tex = texOf(t); if (tex) s.units.set(s.unit, tex); else s.units.delete(s.unit); },
      texStorage2D: (_target: number, _levels: number, format: number, w: number, h: number) => { const t = s.units.get(s.unit); if (t) Object.assign(t, { format: named(format), w, h }); },
      texImage2D: (_target: number, _level: number, format: number, w: unknown, h: unknown, _border: unknown, _format: unknown, _type: unknown, data: unknown) => {
        const t = s.units.get(s.unit);
        if (t && typeof w === 'number' && typeof h === 'number') Object.assign(t, { format: named(format), w, h, upload: data instanceof Uint8Array ? { data: data.slice(), flipY: s.flipY } : undefined });
      },
      texSubImage2D: (_target: number, _level: number, x: number, y: number, w: unknown, h: unknown, _format: unknown, _type: unknown, data: unknown) => {
        const t = s.units.get(s.unit);
        if (t && x === 0 && y === 0 && w === t.w && h === t.h && data instanceof Uint8Array) t.upload = { data: data.slice(), flipY: s.flipY };
      },
      pixelStorei: (pname: number, v: unknown) => { if (named(pname) === 'UNPACK_FLIP_Y_WEBGL') s.flipY = !!v; },
      bindFramebuffer: (target: number, f: unknown) => {
        if (named(target) === 'READ_FRAMEBUFFER') return;
        s.fb = isObj(f) && typeof f.id === 'number' ? framebuffers.get(f.id) ?? null : null;
      },
      framebufferTexture2D: (_target: number, attachment: number, _tt: number, t: unknown) => {
        if (!s.fb) { s.problems.push('a texture attached to the default framebuffer'); return; }
        if (named(attachment).startsWith('COLOR_ATTACHMENT')) s.fb.colour = texOf(t); else s.fb.depth = texOf(t);
      },
      checkFramebufferStatus: () => (s.options.noFloatTargets && s.fb?.colour && /16F|32F/.test(s.fb.colour.format) ? constant('FRAMEBUFFER_INCOMPLETE_ATTACHMENT') : constant('FRAMEBUFFER_COMPLETE')),
      viewport: (x: number, y: number, w: number, h: number) => { s.viewport = [x, y, w, h]; },
      scissor: (x: number, y: number, w: number, h: number) => { s.scissorBox = [x, y, w, h]; },
      enable: (cap: number) => { s.enabled.add(named(cap)); },
      disable: (cap: number) => { s.enabled.delete(named(cap)); },
      depthMask: (m: boolean) => { s.depthMask = m; },
      clear: (bits: number) => { s.clears.push({ ...s.state(), colour: !!(bits & constant('COLOR_BUFFER_BIT')), depth: !!(bits & constant('DEPTH_BUFFER_BIT')) }); },
      drawElements: (_mode: number, count: number) => s.draw(count),
      drawArrays: (_mode: number, _first: number, count: number) => s.draw(count),
      drawElementsInstanced: (_mode: number, count: number, _type: number, _offset: number, instances: number) => s.draw(count, instances),
      drawArraysInstanced: (_mode: number, _first: number, count: number, instances: number) => s.draw(count, instances),
      createShader: (type: number) => { const sh: GlShader = { id: s.ids++, vertex: named(type) === 'VERTEX_SHADER', source: '', errors: [], decls: emptyDecls() }; shaders.set(sh.id, sh); return { id: sh.id }; },
      shaderSource: (o: unknown, src: string) => { const sh = isObj(o) && typeof o.id === 'number' ? shaders.get(o.id) : undefined; if (sh) sh.source = src; },
      compileShader: (o: unknown) => {
        const sh = isObj(o) && typeof o.id === 'number' ? shaders.get(o.id) : undefined;
        if (!sh) return;
        const r = compile(sh.source, sh.vertex);
        sh.errors = r.errors; sh.decls = r.decls;
        if (s.options.breakShader?.test(sh.source)) sh.errors.push('ERROR: 0:1: broken on purpose (the stand-in was asked to)');
      },
      getShaderParameter: (o: unknown) => (isObj(o) && typeof o.id === 'number' ? (shaders.get(o.id)?.errors.length ?? 0) === 0 : false),
      getShaderInfoLog: (o: unknown) => (isObj(o) && typeof o.id === 'number' ? shaders.get(o.id)?.errors.join('\n') ?? '' : ''),
      getShaderSource: (o: unknown) => (isObj(o) && typeof o.id === 'number' ? shaders.get(o.id)?.source ?? '' : ''),
      createProgram: () => { const p: GlProgram = { id: s.ids++, shaders: [], linked: false, log: '', uniforms: [], attributes: [], values: new Map() }; s.programs.push(p); return { id: p.id }; },
      attachShader: (p: unknown, o: unknown) => { const sh = isObj(o) && typeof o.id === 'number' ? shaders.get(o.id) : undefined; if (sh) programOf(p)?.shaders.push(sh); },
      linkProgram: (o: unknown) => { const p = programOf(o); if (p) link(p); },
      getProgramParameter: (o: unknown, pname: number) => {
        const p = programOf(o), n = named(pname);
        if (!p) return 0;
        if (n === 'LINK_STATUS') return p.linked;
        if (n === 'ACTIVE_UNIFORMS') return p.uniforms.length;
        if (n === 'ACTIVE_ATTRIBUTES') return p.attributes.length;
        return 0;
      },
      getProgramInfoLog: (o: unknown) => programOf(o)?.log ?? '',
      getActiveUniform: (o: unknown, i: number) => {
        const u = programOf(o)?.uniforms[i];
        return u ? { name: u.size > 1 ? `${u.name}[0]` : u.name, size: u.size, type: constant(GL_TYPES[u.type] ?? 'FLOAT') } : null;
      },
      getActiveAttrib: (o: unknown, i: number) => { const a = programOf(o)?.attributes[i]; return a ? { name: a.name, size: 1, type: constant(GL_TYPES[a.type] ?? 'FLOAT') } : null; },
      getAttribLocation: (o: unknown, name: string) => programOf(o)?.attributes.findIndex((a) => a.name === name) ?? -1,
      getUniformLocation: (o: unknown, name: string) => {
        const p = programOf(o), base = name.replace(/\[0\]$/, '');
        return p?.uniforms.some((u) => u.name === base) ? { program: o, name: base } : null;
      },
      getUniformBlockIndex: () => -1,
      useProgram: (o: unknown) => { s.program = programOf(o); },
      uniform1i: uniform, uniform1f: uniform, uniform2f: uniform, uniform3f: uniform, uniform4f: uniform, uniform1ui: uniform,
      uniform1fv: setUniform, uniform2fv: setUniform, uniform3fv: setUniform, uniform4fv: setUniform, uniform1iv: setUniform,
      uniformMatrix3fv: (loc: unknown, _t: boolean, v: unknown) => setUniform(loc, v),
      uniformMatrix4fv: (loc: unknown, _t: boolean, v: unknown) => setUniform(loc, v),
    };

    function link(p: GlProgram) {
      const errors = p.shaders.flatMap((sh) => sh.errors.map((e) => `${sh.vertex ? 'vertex' : 'fragment'}: ${e}`));
      const vs = p.shaders.find((sh) => sh.vertex), fs = p.shaders.find((sh) => !sh.vertex);
      if (!vs || !fs) errors.push('a program needs a vertex and a fragment shader');
      else {
        for (const [name, type] of fs.decls.inputs) {
          const out = vs.decls.outputs.get(name);
          if (!fs.decls.used.has(name)) continue; // (an input the shader doesn't use needn't be written)
          if (out !== type) errors.push(`fragment input ${type} ${name} has ${out ? `a vertex output of type ${out}` : `no vertex output (it has ${[...vs.decls.outputs.keys()].join(', ')})`}`);
        }
        for (const [name, u] of fs.decls.uniforms) {
          const v = vs.decls.uniforms.get(name);
          if (v && v.type !== u.type) errors.push(`uniform ${name} is ${v.type} in the vertex shader and ${u.type} in the fragment shader`);
        }
        const uniforms = new Map<string, { name: string; type: string; size: number }>();
        for (const sh of [vs, fs]) for (const [name, u] of sh.decls.uniforms) if (sh.decls.used.has(name)) uniforms.set(name, { name, type: u.type, size: u.size });
        p.uniforms = [...uniforms.values()];
        p.attributes = [...vs.decls.inputs].filter(([name]) => vs.decls.used.has(name)).map(([name, type]) => ({ name, type }));
      }
      p.linked = errors.length === 0;
      p.log = errors.join('\n');
    }
  }
}

function isObj(o: unknown): o is Record<string, unknown> { return typeof o === 'object' && o !== null; }
function* numbers(v: ArrayBufferView) { const d = new DataView(v.buffer, v.byteOffset, v.byteLength); const f = v instanceof Float32Array; for (let i = 0; i < v.byteLength / 4; i++) yield f ? d.getFloat32(i * 4, true) : d.getInt32(i * 4, true); }

/** GL enums: the real values where Three.js compares them with numbers of its own, a made-up one for the rest. */
const REAL: Record<string, number> = {
  NO_ERROR: 0, TEXTURE0: 0x84c0, FLOAT: 0x1406, INT: 0x1404, UNSIGNED_INT: 0x1405, BOOL: 0x8b56,
  FLOAT_VEC2: 0x8b50, FLOAT_VEC3: 0x8b51, FLOAT_VEC4: 0x8b52, INT_VEC2: 0x8b53, INT_VEC3: 0x8b54, INT_VEC4: 0x8b55,
  FLOAT_MAT2: 0x8b5a, FLOAT_MAT3: 0x8b5b, FLOAT_MAT4: 0x8b5c, SAMPLER_2D: 0x8b5e, SAMPLER_3D: 0x8b5f, SAMPLER_CUBE: 0x8b60,
  SAMPLER_2D_SHADOW: 0x8b62, SAMPLER_2D_ARRAY: 0x8dc1,
  COLOR_BUFFER_BIT: 0x4000, DEPTH_BUFFER_BIT: 0x100, STENCIL_BUFFER_BIT: 0x400,
};
const made = new Map<string, number>(), names = new Map<number, string>(Object.entries(REAL).map(([k, v]) => [v, k]));
function constant(name: string): number {
  const real = REAL[name];
  if (real !== undefined) return real;
  let v = made.get(name);
  if (v === undefined) { v = 0x100000 + made.size; made.set(name, v); names.set(v, name); }
  return v;
}
function constantName(v: number) { return names.get(v) ?? ''; }
const GL_TYPES: Record<string, string> = {
  float: 'FLOAT', int: 'INT', uint: 'UNSIGNED_INT', bool: 'BOOL', vec2: 'FLOAT_VEC2', vec3: 'FLOAT_VEC3', vec4: 'FLOAT_VEC4',
  ivec2: 'INT_VEC2', ivec3: 'INT_VEC3', ivec4: 'INT_VEC4', mat2: 'FLOAT_MAT2', mat3: 'FLOAT_MAT3', mat4: 'FLOAT_MAT4',
  sampler2D: 'SAMPLER_2D', sampler3D: 'SAMPLER_3D', samplerCube: 'SAMPLER_CUBE', sampler2DShadow: 'SAMPLER_2D_SHADOW', sampler2DArray: 'SAMPLER_2D_ARRAY',
};

// ---- the shader check ----

interface Decls {
  uniforms: Map<string, { type: string; size: number }>;
  inputs: Map<string, string>;
  outputs: Map<string, string>;
  /** Names used more than where they're declared. */
  used: Set<string>;
}
function emptyDecls(): Decls { return { uniforms: new Map(), inputs: new Map(), outputs: new Map(), used: new Set() }; }

const QUALIFIERS = new Set(['uniform', 'in', 'out', 'inout', 'const', 'flat', 'smooth', 'centroid', 'highp', 'mediump', 'lowp', 'invariant']);
const RESERVED = new Set(('attribute varying coherent volatile restrict readonly writeonly resource atomic_uint noperspective patch sample subroutine common '
  + 'partition active asm class union enum typedef template this goto inline noinline public static extern external interface long short double half fixed '
  + 'unsigned superp input output hvec2 hvec3 hvec4 dvec2 dvec3 dvec4 fvec2 fvec3 fvec4 sampler3DRect filter image1D image2D image3D imageCube iimage1D '
  + 'iimage2D iimage3D iimageCube uimage1D uimage2D uimage3D uimageCube image1DArray image2DArray iimage1DArray iimage2DArray uimage1DArray uimage2DArray '
  + 'imageBuffer iimageBuffer uimageBuffer sampler1D sampler1DShadow sampler1DArray sampler1DArrayShadow isampler1D isampler1DArray usampler1D '
  + 'usampler1DArray sampler2DRect sampler2DRectShadow isampler2DRect usampler2DRect samplerBuffer isamplerBuffer usamplerBuffer sampler2DMS '
  + 'isampler2DMS usampler2DMS sampler2DMSArray isampler2DMSArray usampler2DMSArray sizeof cast namespace using '
  + 'break continue do for while switch case default if else discard return struct void true false').split(/\s+/));

/**
 * A preprocessor `#if` expression (numbers, parentheses, `! - * / + -`, comparisons, `&&`, `||`)
 * worked out; null when it isn't one of those.
 */
export function evalPreprocessor(text: string): number | null {
  const tokens = text.match(/\d+\.?\d*|&&|\|\||[<>=!]=|[()!<>+\-*/]|\S/g) ?? [];
  let i = 0;
  const fail = (): never => { throw new SyntaxError(text); };
  const next = () => tokens[i++];
  const binary = (ops: readonly (readonly string[])[], level: number): number => {
    const level0 = ops[level];
    if (!level0) return unary();
    let left = binary(ops, level + 1);
    while (i < tokens.length && level0.includes(tokens[i] ?? '')) {
      const op = next();
      const right = binary(ops, level + 1);
      left = op === '||' ? Number(left !== 0 || right !== 0) : op === '&&' ? Number(left !== 0 && right !== 0)
        : op === '==' ? Number(left === right) : op === '!=' ? Number(left !== right)
        : op === '<' ? Number(left < right) : op === '>' ? Number(left > right) : op === '<=' ? Number(left <= right) : op === '>=' ? Number(left >= right)
        : op === '+' ? left + right : op === '-' ? left - right : op === '*' ? left * right : right === 0 ? fail() : Math.trunc(left / right);
    }
    return left;
  };
  const unary = (): number => {
    const t = next();
    if (t === undefined) return fail();
    if (t === '!') return Number(unary() === 0);
    if (t === '-') return -unary();
    if (t === '(') { const v = expr(); if (next() !== ')') fail(); return v; }
    return /^\d/.test(t) ? Number(t) : fail();
  };
  const levels = [['||'], ['&&'], ['==', '!='], ['<', '>', '<=', '>='], ['+', '-'], ['*', '/']] as const;
  const expr = () => binary(levels, 0);
  try {
    const v = expr();
    return i === tokens.length ? v : null;
  } catch (e) {
    if (e instanceof SyntaxError) return null;
    throw e;
  }
}

/** Preprocess and check a shader as a GLSL ES 3.00 compiler would (as far as this goes: see the top). */
export function compile(source: string, vertex: boolean): { errors: string[]; decls: Decls; code: string } {
  const errors: string[] = [], decls = emptyDecls();
  const lines = source.replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n').map((l) => l.replace(/\/\/.*$/, ''));
  if (lines[0]?.trim() !== '#version 300 es') errors.push('the first line must be #version 300 es');
  const defines = new Map<string, string>();
  const stack: { on: boolean; taken: boolean }[] = [];
  const active = () => stack.every((s) => s.on);
  const expand = (text: string) => {
    let t = text;
    for (let k = 0; k < 4; k++) t = t.replace(/\b[A-Za-z_]\w*\b/g, (w) => defines.get(w) ?? w);
    return t;
  };
  const test = (expr: string) => {
    const e = expr.replace(/defined\s*\(\s*(\w+)\s*\)|defined\s+(\w+)/g, (_m, a: string | undefined, b: string | undefined) => (defines.has(a ?? b ?? '') ? '1' : '0'));
    const v = expand(e).replace(/\b[A-Za-z_]\w*\b/g, '0');
    const result = evalPreprocessor(v);
    if (result === null) { errors.push(`can't evaluate #if ${expr}`); return false; }
    return result !== 0;
  };
  const out: string[] = [];
  for (const raw of lines.slice(1)) {
    const line = raw.trim();
    const d = /^#\s*(\w+)\s*(.*)$/.exec(line);
    if (!d) { if (active()) out.push(expand(raw)); continue; }
    const [, dir, rest] = d;
    if (dir === 'ifdef' || dir === 'ifndef') { const on = defines.has(rest.trim()) === (dir === 'ifdef'); stack.push({ on, taken: on }); }
    else if (dir === 'if') { const on = test(rest); stack.push({ on, taken: on }); }
    else if (dir === 'elif') { const t = stack[stack.length - 1]; if (t) { t.on = !t.taken && test(rest); t.taken ||= t.on; } }
    else if (dir === 'else') { const t = stack[stack.length - 1]; if (t) { t.on = !t.taken; t.taken = true; } }
    else if (dir === 'endif') stack.pop();
    else if (!active()) continue;
    else if (dir === 'define') {
      const m = /^(\w+)(\([^)]*\))?\s*(.*)$/.exec(rest);
      if (m && !m[2]) defines.set(m[1], m[3].trim());
    } else if (dir === 'undef') defines.delete(rest.trim());
    else if (dir === 'extension' || dir === 'pragma' || dir === 'version' || dir === 'line') continue;
    else errors.push(`unknown directive #${dir}`);
  }
  if (stack.length) errors.push('an #if without its #endif');
  const code = out.join('\n');
  // what GLSL ES 1.00 had and 3.00 doesn't (three's prefix #defines them away for a ShaderMaterial)
  for (const w of ['attribute', 'varying', 'texture2D', 'textureCube', 'gl_FragColor', 'gl_FragData']) if (new RegExp(`\\b${w}\\b`).test(code)) errors.push(`'${w}' isn't GLSL ES 3.00`);
  // the global declarations and the functions (at brace depth 0)
  const functions = new Map<string, number>();
  let depth = 0, stmt = '';
  let defaultFloat = vertex;
  const declared = new Set<string>(), locals = new Set<string>();
  for (const ch of code) {
    if (ch === '{') {
      if (depth === 0) {
        const f = /([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*$/.exec(stmt);
        if (f) {
          const sig = `${f[2]}(${f[3].split(',').map((p) => p.trim().split(/\s+/).filter((w) => !['in', 'out', 'inout', 'const', 'highp', 'mediump', 'lowp'].includes(w))[0] ?? '').join(',')})`;
          functions.set(sig, (functions.get(sig) ?? 0) + 1);
          if (functions.get(sig) === 2) errors.push(`function ${sig} defined twice`);
          if (RESERVED.has(f[2])) errors.push(`'${f[2]}' is reserved`);
          for (const p of f[3].split(',')) { const n = p.trim().split(/\s+/).pop(); if (n) locals.add(n.replace(/\[.*$/, '')); }
          declared.add(f[2]);
        }
        stmt = '';
      }
      depth++;
      continue;
    }
    if (ch === '}') { depth--; continue; }
    if (depth > 0) continue;
    if (ch !== ';') { stmt += ch; continue; }
    const st = stmt.replace(/layout\s*\([^)]*\)/g, ' ').trim();
    stmt = '';
    if (!st) continue;
    const words = st.split(/\s+/);
    if (words[0] === 'precision') { if (words[2] === 'float' && !vertex) defaultFloat = true; continue; }
    const quals: string[] = [];
    while (words.length && QUALIFIERS.has(words[0])) quals.push(words.shift() ?? '');
    const type = words.shift() ?? '';
    for (const part of words.join(' ').split(',')) {
      const m = /^\s*([A-Za-z_]\w*)\s*(?:\[\s*(\d+)\s*\])?\s*(=.*)?$/.exec(part);
      if (!m) { errors.push(`can't read the declaration '${st}'`); continue; }
      const name = m[1], size = m[2] ? Number(m[2]) : 1;
      if (RESERVED.has(name)) errors.push(`'${name}' is reserved`);
      declared.add(name);
      if (quals.includes('uniform')) decls.uniforms.set(name, { type, size });
      else if (quals.includes('in')) decls.inputs.set(name, type);
      else if (quals.includes('out')) decls.outputs.set(name, type);
    }
  }
  if (!defaultFloat) errors.push('no default precision for float in a fragment shader');
  // used: named more than once (once is its declaration)
  const count = new Map<string, number>();
  for (const w of code.match(/\b[A-Za-z_]\w*\b/g) ?? []) count.set(w, (count.get(w) ?? 0) + 1);
  for (const [w, n] of count) if (n > 1) decls.used.add(w);
  // ours (uName, vName) used but not declared
  for (const w of count.keys()) if (/^[uv][A-Z]\w*$/.test(w) && !declared.has(w) && !locals.has(w)) errors.push(`'${w}' isn't declared`);
  return { errors, decls, code };
}
