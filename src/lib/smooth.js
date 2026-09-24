import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export const scrollState = { velocity: 0, direction: 1 };
let lenis = null;

export function initSmoothScroll() {
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
  lenis.on('scroll', (e) => {
    scrollState.velocity = e.velocity;
    if (e.direction) scrollState.direction = e.direction;
    ScrollTrigger.update();
  });
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export const getLenis = () => lenis;

export function scrollToTarget(target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (lenis) {
    lenis.scrollTo(el ?? 0, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  } else if (typeof el === 'number') {
    window.scrollTo({ top: el, behavior: 'smooth' });
  } else if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
}

/** Route in-page anchor clicks through Lenis so pinned sections resolve correctly. */
export function bindAnchors() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const el = id === '#top' ? document.body : document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    scrollToTarget(id === '#top' ? 0 : el);
  });
}
