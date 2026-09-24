import { gsap } from 'gsap';
import { rand } from '../lib/env.js';

/**
 * The page "downloads itself": 16 segments fill in parallel, the counter races to 100,
 * then the curtain splits. Resolves when the curtain starts opening.
 */
export function runPreloader({ reduce }) {
  const root = document.querySelector('.preloader');
  if (!root) return Promise.resolve();
  if (reduce) {
    root.remove();
    return Promise.resolve();
  }

  const bar = root.querySelector('[data-pl-bar]');
  const pctEl = root.querySelector('[data-pl-pct]');
  const sizeEl = root.querySelector('[data-pl-size]');
  const speedEl = root.querySelector('[data-pl-speed]');
  const threadsEl = root.querySelector('[data-pl-threads]');
  const fills = [];
  for (let i = 0; i < 16; i++) {
    const seg = document.createElement('span');
    const fill = document.createElement('i');
    seg.appendChild(fill);
    bar.appendChild(seg);
    fills.push(fill);
  }

  return new Promise((resolve) => {
    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    tl.from(root.querySelector('.preloader-inner'), { y: 20, opacity: 0, duration: 0.5, ease: 'power3.out' });

    const fillStart = tl.duration();
    fills.forEach((fill) => {
      tl.to(fill, { scaleX: 1, duration: rand(0.9, 1.5), ease: 'power1.inOut' }, fillStart + rand(0, 0.35));
    });

    const counter = { p: 0 };
    tl.to(
      counter,
      {
        p: 1,
        duration: tl.duration() - fillStart,
        ease: 'power1.inOut',
        onUpdate() {
          const p = counter.p;
          pctEl.textContent = Math.round(p * 100);
          sizeEl.textContent = (p * 64).toFixed(1);
          speedEl.textContent = p >= 1 ? '0.0' : (38 + Math.sin(p * 20) * 9 + Math.random() * 6).toFixed(1);
          threadsEl.textContent = p >= 1 ? 0 : Math.min(16, Math.ceil(p * 60));
        },
      },
      fillStart,
    );

    tl.to(bar, { scaleX: 0, transformOrigin: '100% 50%', duration: 0.5, ease: 'expo.in' }, '+=0.1');
    tl.to(root.querySelector('.preloader-inner'), { y: -30, opacity: 0, duration: 0.45, ease: 'power3.in' }, '<0.15');
    tl.add(() => {
      root.classList.add('is-done');
      resolve();
    });
    tl.to(root.querySelector('.preloader-panel--top'), { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '<');
    tl.to(root.querySelector('.preloader-panel--bottom'), { yPercent: 100, duration: 1.1, ease: 'expo.inOut' }, '<');
    tl.add(() => root.remove());
  });
}
