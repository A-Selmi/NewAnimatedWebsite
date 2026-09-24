import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { finePointer, whenVisible } from '../lib/env.js';
import { getLenis } from '../lib/smooth.js';

/*
 * Scroll = zoom. A pinned, scrubbed timeline drives the 3D camera through the four
 * ZoomCity levels while the HUD thins out, the breadcrumb and zoom rail track the
 * level, and captions explain each one.
 */

const BASE_Y = 0.25;
const FH = 3;
const KEYS = [
  { px: 46, py: 52, pz: 58, tx: 0, ty: 2, tz: 0, fov: 32 },
  { px: 16, py: 14, pz: 19, tx: 0, ty: 6, tz: 0, fov: 38 },
  { px: 9, py: 12.5, pz: 10.5, tx: -0.4, ty: BASE_Y + FH + 0.6, tz: -0.2, fov: 42 },
  { px: 0.5, py: BASE_Y + FH + 0.3 + 1.45, pz: 2.4, tx: -2.7, ty: BASE_Y + FH + 0.55, tz: -2.8, fov: 58 },
];
const LEVEL_TIMES = [0, 3.0, 5.8, 9.0];
const TOTAL = 10;

export function initZoom({ reduce, city }) {
  const section = document.querySelector('.zoom');
  const stage = section.querySelector('.zoom-stage');
  const captions = [...section.querySelectorAll('.caption')];
  const crumbs = [...section.querySelectorAll('.crumbs button')];
  const ticks = [...section.querySelectorAll('.zr-tick')];
  const fill = section.querySelector('.zr-fill');
  const knob = section.querySelector('.zr-knob');
  const inspect = section.querySelector('[data-inspect]');
  const citizens = section.querySelector('[data-hud-citizens]');

  if (city) Object.assign(city.cam, KEYS[0], { cut: 0, lift: 0, lamp: 0 });
  drawMinimap(section.querySelector('[data-minimap]'), city ? city.layout : null);

  const cam = city ? city.cam : {};
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  tl.to('.zoom-hero', { autoAlpha: 0, yPercent: -12, scale: 0.96, duration: 0.5, ease: 'power2.in' }, 0.05)
    .fromTo(captions[0], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.35)
    .to(captions[0], { autoAlpha: 0, y: -20, duration: 0.3 }, 1.4)
    .to(cam, { ...KEYS[1], duration: 1.6, ease: 'power3.inOut' }, 1.4)
    .fromTo(captions[1], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 2.6)
    .fromTo(['.minimap', '.jump-city'], { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.4, stagger: 0.1 }, 2.5)
    .to('.hud-top', { opacity: 0.55, duration: 0.6 }, 2.4)
    .to(captions[1], { autoAlpha: 0, y: -20, duration: 0.3 }, 3.8)
    .to(cam, { ...KEYS[2], duration: 2, ease: 'power2.inOut' }, 3.8)
    .to(cam, { cut: 1, duration: 1.2, ease: 'power1.inOut' }, 4.0)
    .to(cam, { lift: 1, duration: 1.4, ease: 'power2.inOut' }, 4.2)
    .fromTo(captions[2], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 5.4)
    .to('.hud-top', { opacity: 0.25, duration: 0.6 }, 5.2)
    .to(captions[2], { autoAlpha: 0, y: -20, duration: 0.3 }, 6.6)
    .to(cam, { ...KEYS[3], duration: 2.3, ease: 'sine.inOut' }, 6.6)
    .to(cam, { lift: 0, duration: 1.2, ease: 'power2.inOut' }, 7.6)
    .to(cam, { keyframes: { lamp: [0, 1, 0.15, 1, 0.45, 1] }, duration: 0.7 }, 8.4)
    .fromTo(captions[3], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 8.6)
    .to('.hud-top', { opacity: 0, duration: 0.5 }, 8.2)
    .to({}, { duration: TOTAL - 9 }, 9);

  let current = -1;
  const update = () => {
    const t = tl.time();
    const level = t < 2.2 ? 0 : t < 5 ? 1 : t < 8 ? 2 : 3;
    const p = t / TOTAL;
    gsap.set(fill, { scaleY: p });
    gsap.set(knob, { y: p * 220 });
    if (level !== current) {
      current = level;
      crumbs.forEach((b, i) => {
        b.classList.toggle('is-active', i === level);
        b.setAttribute('aria-current', i === level ? 'step' : 'false');
      });
      ticks.forEach((tk, i) => tk.classList.toggle('is-active', i === level));
      if (level > 0) hideInspect();
    }
    if (citizens) citizens.textContent = Math.round(Math.min(1, p * 4) * 1240).toLocaleString('en-US');
  };
  tl.eventCallback('onUpdate', update);

  let st = null;
  const jumpTo = (level) => {
    const time = LEVEL_TIMES[level] ?? 0;
    if (reduce || !st) {
      tl.time(time);
      update();
      city && city.render();
      if (!st) return;
    }
    const y = st.start + (st.end - st.start) * (time / TOTAL);
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(y, { duration: 1.8, easing: (x) => 1 - Math.pow(1 - x, 3) });
    else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  };
  document.querySelectorAll('[data-zoom-to]').forEach((btn) =>
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      jumpTo(Number(btn.dataset.zoomTo));
    }),
  );
  // Double-tap / double-click zooms in exactly one level
  stage.addEventListener('dblclick', (e) => {
    if (e.target.closest('button, a')) return;
    jumpTo(Math.min(3, current + 1));
  });

  if (reduce) {
    tl.time(0.9);
    update();
    city && city.render();
    return { tl };
  }

  st = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=420%',
    pin: stage,
    scrub: 1,
    animation: tl,
  });

  if (!city) return { tl, st };

  // Pointer parallax + City-level "click to inspect" card
  let visible = true;
  whenVisible(stage, (v) => (visible = v));
  gsap.ticker.add((_, delta) => {
    if (!visible || document.hidden) return;
    city.frame(Math.min(delta, 50) / 1000);
  });

  const inspectFields = {
    kind: inspect.querySelector('[data-inspect-kind]'),
    name: inspect.querySelector('[data-inspect-name]'),
    floors: inspect.querySelector('[data-inspect-floors]'),
    res: inspect.querySelector('[data-inspect-res]'),
    cost: inspect.querySelector('[data-inspect-cost]'),
    deco: inspect.querySelector('[data-inspect-deco]'),
  };
  const stageRect = () => stage.getBoundingClientRect();
  function showInspect(info, x, y) {
    const r = stageRect();
    inspectFields.kind.textContent = info.kind;
    inspectFields.name.textContent = info.name;
    inspectFields.floors.textContent = info.floors;
    inspectFields.res.textContent = info.residents;
    inspectFields.cost.textContent = `$${info.monthly.toLocaleString('en-US')}`;
    inspectFields.deco.style.width = `${Math.round(info.deco * 100)}%`;
    const left = Math.min(x - r.left, r.width - 240);
    const top = Math.min(y - r.top, r.height - 190);
    inspect.style.left = `${left}px`;
    inspect.style.top = `${top}px`;
    inspect.classList.add('is-on');
  }
  function hideInspect() {
    inspect.classList.remove('is-on');
    city.clearPick();
  }

  let pending = null;
  stage.addEventListener(
    'pointermove',
    (e) => {
      city.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      city.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      if (e.pointerType !== 'mouse') return;
      pending = e;
    },
    { passive: true },
  );
  stage.addEventListener('pointerleave', () => {
    pending = null;
    hideInspect();
  });
  let last = 0;
  gsap.ticker.add((time) => {
    if (!pending || time - last < 0.05) return;
    last = time;
    const e = pending;
    pending = null;
    if (tl.time() > 1.3 || e.target.closest('.caption, .crumbs, button, a')) {
      hideInspect();
      return;
    }
    const info = city.pick(e.clientX, e.clientY);
    if (info) showInspect(info, e.clientX, e.clientY);
    else hideInspect();
  });
  // Touch: tap a building to inspect it
  stage.addEventListener('click', (e) => {
    if (finePointer || tl.time() > 1.3 || e.target.closest('button, a')) return;
    const info = city.pick(e.clientX, e.clientY);
    if (info) {
      showInspect(info, e.clientX, e.clientY);
      gsap.delayedCall(2.5, hideInspect);
    }
  });

  return { tl, st };
}

/** Cinematic arrival: the camera dives from high above the city. */
export function diveIn(city) {
  if (!city) return;
  Object.assign(city.intro, { x: -30, y: 150, z: 110 });
  gsap.to(city.intro, { x: 0, y: 0, z: 0, duration: 2.6, ease: 'expo.out' });
}

function drawMinimap(svg, layout) {
  if (!svg) return;
  const ns = 'http://www.w3.org/2000/svg';
  const blocks = layout ? layout.blocks : [];
  const scale = 60 / 60;
  blocks.forEach(([x, z]) => {
    const r = document.createElementNS(ns, 'rect');
    r.setAttribute('x', (x - 6) * scale);
    r.setAttribute('y', (z - 6) * scale);
    r.setAttribute('width', 12 * scale);
    r.setAttribute('height', 12 * scale);
    r.setAttribute('rx', 2);
    r.setAttribute('fill', x === 0 && z === 0 ? '#ffd23f' : '#ffffff');
    r.setAttribute('opacity', x === 0 && z === 0 ? 1 : 0.85);
    svg.appendChild(r);
  });
  const pin = document.createElementNS(ns, 'g');
  pin.innerHTML =
    '<circle r="9" fill="#ff6b4a" opacity=".25"><animate attributeName="r" values="6;14;6" dur="1.8s" repeatCount="indefinite"/></circle><path d="M0 4c-5-6-7-9-7-12a7 7 0 0 1 14 0c0 3-2 6-7 12z" fill="#ff6b4a" transform="translate(0 -4)"/><circle cy="-12" r="2.6" fill="#fff"/>';
  svg.appendChild(pin);
}
