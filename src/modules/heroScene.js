import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  LineSegments,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from 'three';
import { gsap } from 'gsap';
import { clamp, lerp } from '../lib/env.js';

/*
 * "Data warp": thousands of particles stream toward the camera through a tunnel.
 * Each one is drawn twice: a soft point (head) and a line segment (tail) whose length
 * stretches with scroll velocity, so scrolling literally feels like a speed boost.
 */

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uStretch;
  uniform float uPixelRatio;
  uniform vec2 uMouse;
  attribute vec4 aSeed;   // radius, angle, z offset, random
  attribute float aTail;  // 0 = head, 1 = tail
  varying float vAlpha;
  varying float vMix;

  const float SPAN = 66.0;
  const float NEAR = 4.0;

  void main() {
    float speedJitter = 0.6 + aSeed.w * 0.8;
    float th = aSeed.y + uTime * 0.04 * (aSeed.w - 0.5);
    float z = mod(aSeed.z + uTime * speedJitter, SPAN) - (SPAN - NEAR);
    z -= aTail * uStretch * speedJitter;

    vec3 p = vec3(cos(th) * aSeed.x, sin(th) * aSeed.x, z);
    float depth = clamp((z + SPAN - NEAR) / SPAN, 0.0, 1.0);
    p.xy += uMouse * depth * 1.6;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    vAlpha = smoothstep(0.0, 0.3, depth) * (1.0 - smoothstep(0.9, 1.0, depth));
    vAlpha *= mix(1.0, 0.0, aTail);
    vMix = aSeed.w;
    gl_PointSize = (1.2 + aSeed.w * 2.6) * uPixelRatio * (9.0 / -mv.z);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uC1;
  uniform vec3 uC2;
  uniform vec3 uC3;
  uniform float uOpacity;
  uniform float uIsPoint;
  varying float vAlpha;
  varying float vMix;

  void main() {
    float a = vAlpha;
    if (uIsPoint > 0.5) {
      float d = length(gl_PointCoord - 0.5);
      a *= smoothstep(0.5, 0.05, d);
    }
    vec3 col = vMix < 0.5 ? mix(uC1, uC2, vMix * 2.0) : mix(uC2, uC3, (vMix - 0.5) * 2.0);
    gl_FragColor = vec4(col, a * uOpacity);
  }
`;

const PALETTE = {
  dark: ['#7c5cff', '#22d3ee', '#ff4ecd'],
  light: ['#4c2ee6', '#0784a3', '#c81d6d'],
};

export function initHeroScene(canvas, { reduce, scrollState }) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    canvas.remove();
    return { boost() {} };
  }
  const pr = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pr);

  const scene = new Scene();
  const camera = new PerspectiveCamera(62, 1, 0.1, 120);
  camera.position.set(0, 0, 6);

  const count = window.innerWidth < 768 ? 1400 : 3200;
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    seeds[i * 4] = 1.3 + Math.pow(Math.random(), 0.65) * 9;
    seeds[i * 4 + 1] = Math.random() * Math.PI * 2;
    seeds[i * 4 + 2] = Math.random() * 66;
    seeds[i * 4 + 3] = Math.random();
  }

  // Points (heads)
  const pointGeo = new BufferGeometry();
  pointGeo.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
  pointGeo.setAttribute('aSeed', new BufferAttribute(seeds, 4));
  pointGeo.setAttribute('aTail', new BufferAttribute(new Float32Array(count), 1));

  // Line segments (tails): two vertices per particle sharing the same seed
  const lineSeeds = new Float32Array(count * 8);
  const lineTail = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 4; k++) {
      lineSeeds[i * 8 + k] = seeds[i * 4 + k];
      lineSeeds[i * 8 + 4 + k] = seeds[i * 4 + k];
    }
    lineTail[i * 2 + 1] = 1;
  }
  const lineGeo = new BufferGeometry();
  lineGeo.setAttribute('position', new BufferAttribute(new Float32Array(count * 6), 3));
  lineGeo.setAttribute('aSeed', new BufferAttribute(lineSeeds, 4));
  lineGeo.setAttribute('aTail', new BufferAttribute(lineTail, 1));

  const uniforms = {
    uTime: { value: 0 },
    uStretch: { value: 0.8 },
    uPixelRatio: { value: pr },
    uMouse: { value: new Vector2() },
    uC1: { value: new Color() },
    uC2: { value: new Color() },
    uC3: { value: new Color() },
    uOpacity: { value: 1 },
  };
  const makeMaterial = (isPoint) =>
    new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { ...uniforms, uIsPoint: { value: isPoint ? 1 : 0 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
  const pointMat = makeMaterial(true);
  const lineMat = makeMaterial(false);

  const points = new Points(pointGeo, pointMat);
  const lines = new LineSegments(lineGeo, lineMat);
  points.frustumCulled = false;
  lines.frustumCulled = false;
  scene.add(lines, points);

  function applyTheme() {
    const light = document.documentElement.dataset.theme === 'light';
    const [a, b, c] = light ? PALETTE.light : PALETTE.dark;
    uniforms.uC1.value.set(a);
    uniforms.uC2.value.set(b);
    uniforms.uC3.value.set(c);
    uniforms.uOpacity.value = light ? 0.75 : 1;
    [pointMat, lineMat].forEach((m) => {
      m.blending = light ? NormalBlending : AdditiveBlending;
      m.needsUpdate = true;
    });
  }
  applyTheme();
  window.addEventListener('themechange', applyTheme);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener(
    'pointermove',
    (e) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    },
    { passive: true },
  );

  const state = { speed: 7, stretch: 0.8, boost: 0 };
  let visible = true;
  const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
  io.observe(canvas);

  const render = () => renderer.render(scene, camera);

  if (reduce) {
    uniforms.uTime.value = 12;
    render();
    return { boost() {} };
  }

  gsap.ticker.add((_, delta) => {
    if (!visible || document.hidden) return;
    const dt = Math.min(delta, 50) / 1000;
    const v = Math.abs(scrollState.velocity || 0);
    const targetSpeed = 7 + Math.min(v * 1.4, 70) + state.boost;
    const targetStretch = 0.8 + Math.min(v * 0.35, 14) + state.boost * 0.22;
    state.speed = lerp(state.speed, targetSpeed, 0.08);
    state.stretch = lerp(state.stretch, targetStretch, 0.08);
    uniforms.uTime.value += dt * state.speed;
    uniforms.uStretch.value = state.stretch;

    mouse.x = lerp(mouse.x, mouse.tx, 0.05);
    mouse.y = lerp(mouse.y, mouse.ty, 0.05);
    uniforms.uMouse.value.x = mouse.x;
    uniforms.uMouse.value.y = mouse.y;
    camera.rotation.y = -mouse.x * 0.08;
    camera.rotation.x = mouse.y * 0.06;
    camera.rotation.z = clamp(scrollState.velocity * 0.0025, -0.12, 0.12) + Math.sin(uniforms.uTime.value * 0.01) * 0.05;
    render();
  });

  return {
    /** Warp-speed burst used when the preloader curtain opens. */
    boost(amount = 90, duration = 2.4) {
      state.boost = amount;
      gsap.to(state, { boost: 0, duration, ease: 'power3.out' });
    },
  };
}
