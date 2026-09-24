import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { rand } from '../lib/env.js';

/**
 * Pinned, scroll-scrubbed demo of segmented downloading: 64 cells fill in parallel
 * while a single-thread bar crawls alongside. HUD numbers are derived from the cells.
 */
export function initThreads({ reduce }) {
  const grid = document.querySelector('[data-grid64]');
  if (!grid) return;

  const cells = [];
  for (let i = 0; i < 64; i++) {
    const cell = document.createElement('span');
    cell.className = 'cell';
    cell.style.setProperty('--i', i);
    const fill = document.createElement('i');
    cell.appendChild(fill);
    grid.appendChild(cell);
    cells.push({ cell, fill, state: '' });
  }

  const pctEl = document.querySelector('[data-hud-pct]');
  const threadsEl = document.querySelector('[data-hud-threads]');
  const speedEl = document.querySelector('[data-hud-speed]');
  const single = document.querySelector('[data-race-single]');
  const multi = document.querySelector('[data-race-multi]');
  const singlePct = document.querySelector('[data-race-single-pct]');
  const multiPct = document.querySelector('[data-race-multi-pct]');

  const SINGLE_MAX = 0.06;
  const build = () => {
    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    cells.forEach((c, i) => {
      // Rough "wave" so neighbouring segments start close together, plus noise.
      const row = Math.floor(i / 8);
      const col = i % 8;
      const start = ((row + col) / 14) * 0.25 + rand(0, 0.12);
      tl.fromTo(c.fill, { scaleX: 0 }, { scaleX: 1, duration: rand(0.45, 0.62) }, start);
      tl.fromTo(c.cell, { scale: 0.82 }, { scale: 1, duration: 0.18, ease: 'back.out(3)' }, start);
    });
    tl.fromTo(single, { scaleX: 0 }, { scaleX: SINGLE_MAX, duration: tl.duration() }, 0);
    tl.eventCallback('onUpdate', () => update(tl));
    return tl;
  };

  const update = (tl) => {
    let sum = 0;
    let active = 0;
    cells.forEach((c) => {
      const v = gsap.getProperty(c.fill, 'scaleX');
      sum += v;
      const state = v >= 0.999 ? 'done' : v > 0.001 ? 'active' : '';
      if (state !== c.state) {
        c.cell.classList.toggle('is-active', state === 'active');
        c.cell.classList.toggle('is-done', state === 'done');
        c.state = state;
      }
      if (state === 'active') active++;
    });
    const avg = sum / 64;
    const pct = Math.round(avg * 100);
    pctEl.textContent = pct;
    gsap.set(multi, { scaleX: avg });
    threadsEl.textContent = active;
    speedEl.textContent = active ? (active * 2.05 + Math.random() * 4).toFixed(1) : '0.0';
    multiPct.textContent = `${pct}%`;
    singlePct.textContent = `${Math.round(tl.progress() * SINGLE_MAX * 100)}%`;
  };

  if (reduce) {
    const tl = build();
    tl.progress(1);
    return;
  }

  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const tl = build();
    const st = ScrollTrigger.create({
      trigger: '.threads-pin',
      start: 'top top',
      end: '+=170%',
      pin: true,
      scrub: 0.7,
      animation: tl,
    });
    // Grid gently rotates in 3D while scrubbing.
    gsap.fromTo(
      '.grid64',
      { rotateX: 18, rotateY: -16, transformPerspective: 1200 },
      { rotateX: 0, rotateY: 0, ease: 'none', scrollTrigger: { trigger: '.threads', start: 'top bottom', end: 'top top', scrub: true } },
    );
    return () => st.kill();
  });
  mm.add('(max-width: 900px)', () => {
    const tl = build().pause();
    tl.duration(3.2);
    ScrollTrigger.create({ trigger: '[data-grid64]', start: 'top 70%', once: true, onEnter: () => tl.play() });
  });
}
