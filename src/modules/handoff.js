import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { rand, whenVisible } from '../lib/env.js';

/**
 * A cursor clicks "Download" in a mock browser; the file flies along a curve into
 * the Motrix window, where a new task appears and completes. Loops while on screen.
 */
export function initHandoff({ reduce }) {
  const stage = document.querySelector('[data-handoff]');
  if (!stage) return;
  const btn = stage.querySelector('[data-hf-btn]');
  const app = stage.querySelector('[data-hf-app]');
  const list = app.querySelector('.mm-list');
  const svg = stage.querySelector('[data-hf-svg]');
  const path = stage.querySelector('[data-hf-path]');
  const packet = stage.querySelector('[data-hf-packet]');
  const cursor = stage.querySelector('[data-hf-cursor]');
  const task = stage.querySelector('[data-hf-task]');
  const fill = stage.querySelector('[data-hf-fill]');
  const status = stage.querySelector('[data-hf-status]');
  const speed = stage.querySelector('[data-hf-speed]');

  const L = { x1: 0, y1: 0, x2: 0, y2: 0, w: 0, h: 0 };
  const layout = () => {
    const s = stage.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const l = list.getBoundingClientRect();
    L.x1 = b.left - s.left + b.width / 2;
    L.y1 = b.top - s.top + b.height / 2;
    L.x2 = l.left - s.left + 40;
    L.y2 = l.top - s.top + 26;
    L.w = s.width;
    L.h = s.height;
    svg.setAttribute('viewBox', `0 0 ${s.width} ${s.height}`);
    path.setAttribute('d', `M${L.x1},${L.y1} C${L.x1 + 140},${L.y1 - 150} ${L.x2 + 160},${L.y2 - 190} ${L.x2},${L.y2}`);
  };
  layout();

  const taskPad = { paddingTop: 10, paddingBottom: 10 };
  if (reduce) {
    gsap.set(fill, { scaleX: 0.6 });
    status.textContent = 'Downloading';
    gsap.set(path, { opacity: 0.5 });
    return;
  }

  const collapsed = { height: 0, paddingTop: 0, paddingBottom: 0, opacity: 0, marginBottom: -6 };
  gsap.set(task, collapsed);
  gsap.set(path, { drawSVG: '0%' });
  const net = { v: 0 };

  const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8, paused: true });
  tl.set(packet, { opacity: 0, scale: 0 })
    .set(fill, { scaleX: 0 })
    .call(() => {
      status.textContent = 'Queued';
      status.classList.remove('is-done');
    })
    // cursor glides in and clicks
    .fromTo(
      cursor,
      { x: () => Math.min(L.x1 + 150, L.w - 30), y: () => Math.min(L.y1 + 130, L.h - 30), opacity: 0 },
      { x: () => L.x1 - 2, y: () => L.y1 - 4, opacity: 1, duration: 1.1, ease: 'power3.inOut' },
    )
    .to(cursor, { scale: 0.8, duration: 0.1, yoyo: true, repeat: 1 })
    .call(() => {
      btn.classList.remove('is-clicked');
      void btn.offsetWidth;
      btn.classList.add('is-clicked');
    }, null, '<')
    .to(btn, { scale: 0.92, duration: 0.1, yoyo: true, repeat: 1 }, '<')
    // packet pops out and flies along the curve, trail drawing behind it
    .set(packet, { opacity: 1, motionPath: { path, align: path, alignOrigin: [0.5, 0.5], start: 0, end: 0 } })
    .to(packet, { scale: 1, duration: 0.35, ease: 'back.out(3)' })
    .to(packet, { duration: 1.15, ease: 'power2.inOut', motionPath: { path, align: path, alignOrigin: [0.5, 0.5] }, rotation: 360 }, '-=0.1')
    .fromTo(path, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 1.15, ease: 'power2.inOut' }, '<')
    .to(cursor, { opacity: 0, x: '+=40', y: '+=40', duration: 0.6 }, '<')
    .to(path, { drawSVG: '100% 100%', duration: 0.5, ease: 'power2.in' }, '-=0.35')
    .to(packet, { scale: 0, opacity: 0, duration: 0.25, ease: 'power2.in' }, '-=0.15')
    // Motrix window reacts and a task appears
    .to(app, { scale: 1.035, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' }, '<')
    .to(task, { height: 'auto', ...taskPad, opacity: 1, marginBottom: 0, duration: 0.6, ease: 'expo.out' }, '<')
    .call(() => (status.textContent = 'Downloading'))
    .to(fill, { scaleX: 1, duration: 2.2, ease: 'power1.inOut' })
    .fromTo(
      net,
      { v: 0 },
      {
        v: 1,
        duration: 2.2,
        onUpdate: () => (speed.textContent = `↓ ${(net.v < 1 ? rand(48, 72) : 0).toFixed(1)} MB/s`),
      },
      '<',
    )
    .call(() => {
      status.textContent = 'Completed';
      status.classList.add('is-done');
      speed.textContent = '↓ 0 MB/s';
    })
    .to(task, { ...collapsed, duration: 0.5, ease: 'power3.in' }, '+=1.4');

  let visible = false;
  whenVisible(stage, (v) => {
    visible = v;
    if (v) tl.play();
    else tl.pause();
  });

  ScrollTrigger.addEventListener('refresh', () => {
    layout();
    tl.invalidate();
    if (!visible) tl.pause();
  });
  window.addEventListener('resize', () => {
    layout();
    tl.invalidate();
  });
}
