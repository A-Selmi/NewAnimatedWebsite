import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Skeleton-first construction, scrubbed by scroll: foundation → amber skeleton
 * (floor by floor, crane working) → walls & roof → finished. Each stage is paid
 * as it happens and the balance ticks down like a contractor's draw schedule.
 */
export function initBuild({ reduce }) {
  const svg = document.querySelector('.site');
  if (!svg) return;
  const q = (s) => svg.querySelector(s);
  const qa = (s) => [...svg.querySelectorAll(s)];
  const stages = [...document.querySelectorAll('.stages li')];
  const pays = [...document.querySelectorAll('[data-pay]')];
  const balanceEl = document.querySelector('[data-balance]');
  const money = { v: 50000 };
  const fmt = () => (balanceEl.textContent = Math.round(money.v).toLocaleString('en-US'));

  const STAGE_AT = [0, 1.2, 2.9, 4.4];
  const PAID = [
    [1.1, 48200],
    [1.2, 42000],
    [2.8, 32600],
    [4.3, 25500],
  ];

  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  // Stage 1: foundation
  tl.fromTo(q('[data-s-found] .site-dirt'), { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.4 }, 0)
    .fromTo(q('[data-s-found] .site-slab'), { scaleX: 0, transformOrigin: '50% 50%' }, { scaleX: 1, duration: 0.6, ease: 'power2.out' }, 0.4)
    .to(money, { v: 48200, duration: 0.2, onUpdate: fmt }, 0.9)
    .to(money, { v: 42000, duration: 0.2, onUpdate: fmt }, 1.1);
  // Stage 2: skeleton rises floor by floor, crane lowers beams
  const trolley = q('[data-trolley]');
  const cable = q('[data-cable]');
  const hook = q('[data-hook]');
  const hookTo = (y, x, at) => {
    tl.to(trolley, { x, duration: 0.3, ease: 'sine.inOut' }, at)
      .to(cable, { attr: { y2: y }, duration: 0.3, ease: 'sine.inOut' }, at)
      .to(hook, { y, duration: 0.3, ease: 'sine.inOut' }, at);
  };
  gsap.set(trolley, { x: 420, y: 82 });
  qa('.skel g path').forEach((p, i) => {
    const at = 1.2 + i * 0.5;
    tl.fromTo(p, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.45 }, at);
    hookTo(210 - i * 70, 300 + i * 40, at - 0.1);
  });
  tl.to(money, { v: 32600, duration: 0.2, onUpdate: fmt }, 2.7);
  // Stage 3: walls and roof, bottom up
  qa('[data-wall]').forEach((w, i) => {
    tl.fromTo(w, { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.4, ease: 'power2.out' }, 2.9 + i * 0.4);
  });
  tl.fromTo(q('[data-roof]'), { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'bounce.out' }, 4.0)
    .to(money, { v: 25500, duration: 0.2, onUpdate: fmt }, 4.2);
  // Stage 4: finished
  tl.to(q('[data-crane]'), { x: 160, opacity: 0, duration: 0.5, ease: 'power2.in' }, 4.4)
    .fromTo(qa('.site-tree'), { scale: 0, transformOrigin: '50% 100%' }, { scale: 1, duration: 0.4, ease: 'back.out(2.5)', stagger: 0.1 }, 4.5)
    .fromTo(q('.site-path'), { scaleX: 0, transformOrigin: '50% 50%' }, { scaleX: 1, duration: 0.3 }, 4.5)
    .fromTo(q('[data-s-badge]'), { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'back.out(2)' }, 4.7)
    .to({}, { duration: 0.4 });

  const sync = () => {
    const t = tl.time();
    const stage = STAGE_AT.filter((s) => t >= s).length - 1;
    stages.forEach((li, i) => {
      li.classList.toggle('is-active', i === stage);
      li.classList.toggle('is-past', i < stage);
    });
    pays.forEach((li, i) => li.classList.toggle('is-paid', t >= PAID[i][0]));
    svg.classList.toggle('is-lit', t > 4.6);
  };
  tl.eventCallback('onUpdate', sync);

  if (reduce) {
    tl.progress(1);
    sync();
    return;
  }
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    ScrollTrigger.create({ trigger: '.build-pin', start: 'top top', end: '+=160%', pin: true, scrub: 0.8, animation: tl });
  });
  mm.add('(max-width: 900px)', () => {
    ScrollTrigger.create({ trigger: '.build-visual', start: 'top 80%', end: 'bottom 30%', scrub: 0.8, animation: tl });
  });
}
