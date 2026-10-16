import * as THREE from 'three';
import { EffectsModel, type Drawable, type SpriteImage } from './effects';
import { placeDrawable, type PictureLayout } from './layout';

/**
 * Draws an EffectsModel over the picture with Three.js (in the renderer's scene, in front of
 * everything): particles and outlines as one batch of little squares, sprite flashes and
 * weapon trails as textured quads, glows as soft discs, and the hurt flash as a red edge.
 */
const MAX_RECTS = 1200;

const rectVertex = `
  attribute vec4 rect;   // x, y, w, h (C64 pixels, y down)
  attribute vec4 tint;   // r, g, b, alpha
  varying vec4 vTint;
  void main() {
    vTint = tint;
    vec3 p = vec3(rect.x + position.x * rect.z, -(rect.y + position.y * rect.w), 0.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;
const rectFragment = `
  varying vec4 vTint;
  void main() { gl_FragColor = vTint; }`;
const edgeFragment = `
  uniform vec3 color; uniform float alpha; uniform float width; varying vec2 vPos;
  void main() {
    float d = min(min(vPos.x, 320.0 - vPos.x), min(vPos.y, 200.0 - vPos.y));
    float a = alpha * pow(clamp(1.0 - d / width, 0.0, 1.0), 1.6);
    gl_FragColor = vec4(color, a);
  }`;
const edgeVertex = `
  varying vec2 vPos;
  void main() { vPos = vec2(position.x, -position.y); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

export class EffectsLayer {
  readonly model = new EffectsModel();
  /** Drawn at all (the player's EFFECTS option). */
  enabled = true;
  private readonly group = new THREE.Group();
  private readonly rects: { mesh: THREE.Mesh; geo: THREE.InstancedBufferGeometry; rect: THREE.InstancedBufferAttribute; tint: THREE.InstancedBufferAttribute }[] = [];
  private readonly quad = new THREE.PlaneGeometry(1, 1);
  private readonly images: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly glows: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly rings: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly ringGeo = new THREE.RingGeometry(0.92, 1, 48);
  /** Textures of the sprite images being drawn (freed when they're no longer drawn). */
  private readonly textures = new Map<SpriteImage, THREE.DataTexture>();
  private readonly used = new Set<SpriteImage>();
  private readonly glowTex = glowTexture();
  private readonly edge: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  constructor(scene: THREE.Scene) {
    this.group.position.z = 95;
    scene.add(this.group);
    // two batches of squares: normal blending (pixels) and additive (light)
    for (const add of [false, true]) {
      const geo = new THREE.InstancedBufferGeometry();
      geo.index = new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1);
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]), 3));
      const rect = new THREE.InstancedBufferAttribute(new Float32Array(MAX_RECTS * 4), 4).setUsage(THREE.DynamicDrawUsage);
      const tint = new THREE.InstancedBufferAttribute(new Float32Array(MAX_RECTS * 4), 4).setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('rect', rect); geo.setAttribute('tint', tint);
      geo.instanceCount = 0;
      const mat = new THREE.ShaderMaterial({ vertexShader: rectVertex, fragmentShader: rectFragment, transparent: true, depthTest: false, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = add ? 22 : 21;
      this.group.add(mesh);
      this.rects.push({ mesh, geo, rect, tint });
    }
    const edgeGeo = new THREE.PlaneGeometry(320, 200);
    edgeGeo.translate(160, -100, 0);
    this.edge = new THREE.Mesh(edgeGeo, new THREE.ShaderMaterial({
      vertexShader: edgeVertex, fragmentShader: edgeFragment, transparent: true, depthTest: false, depthWrite: false,
      uniforms: { color: { value: new THREE.Color(1, 0, 0) }, alpha: { value: 0 }, width: { value: 24 } },
    }));
    this.edge.renderOrder = 25;
    this.edge.visible = false;
    this.group.add(this.edge);
  }

  /** Lay out the effects for time `t` (ms), where the picture's `layout` shows them; returns how far to shake the picture. */
  update(t: number, layout: PictureLayout | null = null) {
    const list = this.enabled ? this.model.drawables(t).map((d) => placeDrawable(layout, d)) : [];
    const counts = [0, 0];
    let images = 0, glows = 0, rings = 0;
    this.edge.visible = false;
    const put = (d: { x: number; y: number; w: number; h: number; color: number; alpha: number }, add: boolean) => {
      const b = this.rects[add ? 1 : 0], i = counts[add ? 1 : 0]++;
      if (i >= MAX_RECTS) return;
      b.rect.setXYZW(i, d.x, d.y, d.w, d.h);
      const c = new THREE.Color(d.color);
      b.tint.setXYZW(i, c.r, c.g, c.b, d.alpha);
    };
    this.used.clear();
    for (const d of list) {
      if (d.kind === 'ring') {
        const m = this.ringMesh(rings++);
        m.material.color.set(d.color); m.material.opacity = d.alpha;
        m.scale.set(d.r, d.r, 1); m.position.set(d.x, -d.y, 2); m.visible = true;
      } else this.place(d, put, () => this.imageMesh(images++), () => this.glowMesh(glows++));
    }
    for (let i = rings; i < this.rings.length; i++) this.rings[i].visible = false;
    for (const [img, tex] of this.textures) if (!this.used.has(img)) { tex.dispose(); this.textures.delete(img); }
    this.rects.forEach((b, k) => { b.geo.instanceCount = Math.min(counts[k], MAX_RECTS); b.rect.needsUpdate = true; b.tint.needsUpdate = true; });
    for (let i = images; i < this.images.length; i++) this.images[i].visible = false;
    for (let i = glows; i < this.glows.length; i++) this.glows[i].visible = false;
    return this.enabled ? this.model.shake(t) : { x: 0, y: 0 };
  }

  private place(d: Drawable, put: (r: { x: number; y: number; w: number; h: number; color: number; alpha: number }, add: boolean) => void,
    image: () => THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>, glow: () => THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>) {
    switch (d.kind) {
      case 'rect': put(d, d.add); break;
      case 'frame': {
        const g = d.grow, { x, y, w, h } = d;
        for (const r of [{ x: x - g, y: y - g, w: w + 2 * g, h: 1 }, { x: x - g, y: y + h + g - 1, w: w + 2 * g, h: 1 }, { x: x - g, y: y - g, w: 1, h: h + 2 * g }, { x: x + w + g - 1, y: y - g, w: 1, h: h + 2 * g }]) put({ ...r, color: d.color, alpha: d.alpha }, true);
        break;
      }
      case 'image': {
        const m = image(), tex = this.texture(d.image);
        if (m.material.map !== tex) { m.material.map = tex; m.material.needsUpdate = true; }
        m.material.color.set(d.color);
        m.material.opacity = d.alpha;
        const blending = d.add ? THREE.AdditiveBlending : THREE.NormalBlending;
        if (m.material.blending !== blending) { m.material.blending = blending; m.material.needsUpdate = true; }
        const w = d.image.w * d.scale, h = d.image.h * d.scale;
        m.scale.set(w, h, 1);
        m.position.set(d.x + w / 2, -(d.y + h / 2), 1);
        m.visible = true;
        break;
      }
      case 'glow': {
        const m = glow();
        m.material.color.set(d.color);
        m.material.opacity = d.alpha;
        m.scale.set(d.r * 2, d.r * 2, 1);
        m.position.set(d.x, -d.y, -1);
        m.visible = true;
        break;
      }
      case 'edge': {
        const u = this.edge.material.uniforms;
        u.color.value.set(d.color); u.alpha.value = d.alpha; u.width.value = d.width;
        this.edge.visible = true;
        break;
      }
    }
  }

  private imageMesh(i: number) {
    while (this.images.length <= i) {
      const m = new THREE.Mesh(this.quad, new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, alphaTest: 0.01 }));
      m.renderOrder = 20;
      this.group.add(m);
      this.images.push(m);
    }
    return this.images[i];
  }

  private ringMesh(i: number) {
    while (this.rings.length <= i) {
      const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.renderOrder = 23;
      this.group.add(m);
      this.rings.push(m);
    }
    return this.rings[i];
  }

  private glowMesh(i: number) {
    while (this.glows.length <= i) {
      const m = new THREE.Mesh(this.quad, new THREE.MeshBasicMaterial({ map: this.glowTex, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.renderOrder = 19;
      this.group.add(m);
      this.glows.push(m);
    }
    return this.glows[i];
  }

  /** A sprite image's shape as a white texture (its lit pixels), made once per image. */
  private texture(img: SpriteImage) {
    this.used.add(img);
    let t = this.textures.get(img);
    if (!t) {
      const data = new Uint8Array(img.w * img.h * 4);
      for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
        const o = ((img.h - 1 - y) * img.w + x) * 4; // (textures go bottom up)
        data[o] = data[o + 1] = data[o + 2] = 255; data[o + 3] = img.pixels[y * img.w + x] >= 0 ? 255 : 0;
      }
      t = new THREE.DataTexture(data, img.w, img.h, THREE.RGBAFormat);
      t.magFilter = t.minFilter = THREE.NearestFilter;
      t.needsUpdate = true;
      this.textures.set(img, t);
    }
    return t;
  }
}

/** A round glow, fading out from the middle. */
function glowTexture() {
  const n = 64, data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const d = Math.hypot(x - n / 2 + 0.5, y - n / 2 + 0.5) / (n / 2), v = Math.max(0, 1 - d) ** 2;
    const o = (y * n + x) * 4;
    data[o] = data[o + 1] = data[o + 2] = 255; data[o + 3] = v * 255;
  }
  const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
