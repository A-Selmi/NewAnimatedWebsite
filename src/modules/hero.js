import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { finePointer } from '../lib/env.js';

const WORDS = ['everything.', 'torrents.', 'magnets.', 'big files.', 'the lot.'];

/** Hero entrance: split-character title, staggered copy, app window flying up into place. */
export function heroIntro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

  const lines = gsap.utils.toArray('[data-hero-split]');
  const splits = lines.map((el) => new SplitText(el, { type: 'chars', charsClass: 'char', aria: 'none' }));
  const chars = splits.flatMap((s) => s.chars);
  gsap.set('.hero-title', { perspective: 900 });

  tl.from(chars, {
    yPercent: 120,
    rotateX: -90,
    opacity: 0,
    transformOrigin: '50% 100% -40px',
    duration: 1.4,
    stagger: { each: 0.035, from: 'start' },
  })
    .from('[data-rotator]', { yPercent: 110, opacity: 0, scale: 0.8, filter: 'blur(12px)', duration: 1.4 }, 0.25)
    .from('[data-hero-in]', { y: 36, opacity: 0, duration: 1.2, stagger: 0.09 }, 0.45)
    .from('.hero-stage', { y: 220, opacity: 0, duration: 1.8 }, 0.5)
    .from('.float-badge', { scale: 0, opacity: 0, duration: 1, ease: 'back.out(2.2)', stagger: 0.1 }, 1.1)
    .add(() => chars.forEach((c) => c.style.removeProperty('transform')), '>');

  return tl;
}

/** Scramble the second headline line through a list of words, forever. */
export function initRotator() {
  const el = document.querySelector('[data-rotator]');
  if (!el) return;
  let i = 0;
  const next = () => {
    i = (i + 1) % WORDS.length;
    gsap.to(el, {
      duration: 1.1,
      scrambleText: { text: WORDS[i], chars: 'lowerCase', speed: 0.5, revealDelay: 0.3 },
      ease: 'none',
      onComplete: () => gsap.delayedCall(2.2, next),
    });
  };
  gsap.delayedCall(2.6, next);
}

/** Scroll-linked hero choreography + pointer parallax on the badges and app window. */
export function initHeroScroll() {
  // Copy drifts up and fades as you leave the hero.
  gsap.to('.hero-inner', {
    yPercent: -35,
    opacity: 0,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '55% top', scrub: true },
  });

  // App window starts tilted back like a laptop lid and flattens as it reaches centre.
  gsap.fromTo(
    '.app-scroll',
    { rotateX: 32, scale: 0.86, y: 40, transformOrigin: '50% 0%' },
    {
      rotateX: 0,
      scale: 1,
      y: 0,
      ease: 'none',
      scrollTrigger: { trigger: '.hero-stage', start: 'top 85%', end: 'center 55%', scrub: 0.6 },
    },
  );

  // Badges fan outward with scroll.
  gsap.utils.toArray('.float-layer').forEach((layer, i) => {
    const dir = i % 2 === 0 ? -1 : 1;
    gsap.to(layer, {
      x: dir * 60,
      y: -80 * (parseFloat(layer.dataset.depth) || 1),
      ease: 'none',
      scrollTrigger: { trigger: '.hero-stage', start: 'top 60%', end: 'bottom top', scrub: true },
    });
  });

  // Gentle idle bob on each badge.
  gsap.utils.toArray('.float-badge').forEach((badge, i) => {
    gsap.to(badge, {
      y: i % 2 ? 12 : -12,
      rotation: i % 2 ? 2.5 : -2.5,
      duration: 2.4 + i * 0.35,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  });

  gsap.to('.scroll-hint', {
    opacity: 0,
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=200', scrub: true },
  });

  if (!finePointer) return;
  const tilt = document.querySelector('.app-tilt');
  const rx = gsap.quickTo(tilt, 'rotationX', { duration: 1, ease: 'power3' });
  const ry = gsap.quickTo(tilt, 'rotationY', { duration: 1, ease: 'power3' });
  const layers = gsap.utils.toArray('.float-layer .float-badge').map((badge) => ({
    x: gsap.quickTo(badge, 'x', { duration: 1.2, ease: 'power3' }),
    depth: parseFloat(badge.parentElement.dataset.depth) || 1,
  }));
  const hero = document.querySelector('.hero');
  hero.addEventListener('pointermove', (e) => {
    const nx = e.clientX / window.innerWidth - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;
    rx(-ny * 8);
    ry(nx * 10);
    layers.forEach((l) => l.x(nx * 50 * l.depth));
  });
  hero.addEventListener('pointerleave', () => {
    rx(0);
    ry(0);
  });
}
