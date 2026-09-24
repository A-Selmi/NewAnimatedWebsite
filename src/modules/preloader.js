import { gsap } from 'gsap';

/**
 * Onboarding in miniature: the terms appear, the mayor's signature writes itself,
 * the approval stamp slams down, and the contract flies away to reveal the city.
 * Resolves when the reveal starts. Click to hurry it along.
 */
export function runPreloader({ reduce }) {
  const root = document.querySelector('.preloader');
  if (!root) return Promise.resolve();
  if (reduce) {
    root.remove();
    return Promise.resolve();
  }
  const contract = root.querySelector('.contract');
  const pct = root.querySelector('[data-pl-pct]');
  const counter = { v: 0 };

  return new Promise((resolve) => {
    const tl = gsap.timeline();
    tl.from(contract, { y: 60, rotation: -3, opacity: 0, duration: 0.7, ease: 'back.out(1.6)' })
      .from(root.querySelectorAll('.contract-terms li'), { x: -16, opacity: 0, duration: 0.35, stagger: 0.12, ease: 'power2.out' }, '-=0.3')
      .fromTo(root.querySelector('[data-sig]'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.1, ease: 'power1.inOut' }, '-=0.1')
      .fromTo(
        root.querySelector('.stamp'),
        { scale: 2.6, rotation: -40, opacity: 0 },
        { scale: 1, rotation: -12, opacity: 0.92, duration: 0.32, ease: 'power4.in' },
        '-=0.15',
      )
      .to(contract, { keyframes: { x: [0, -6, 5, -3, 2, 0], y: [0, 3, -2, 1, 0, 0] }, duration: 0.35, ease: 'none' })
      .to(counter, { v: 100, duration: tl.duration(), ease: 'power1.inOut', onUpdate: () => (pct.textContent = Math.round(counter.v)) }, 0)
      .add(() => {
        root.classList.add('is-done');
        resolve();
      }, '+=0.2')
      .to(contract, { y: () => -window.innerHeight * 1.1, rotation: 10, duration: 0.9, ease: 'power3.in' }, '<')
      .to(root, { autoAlpha: 0, duration: 0.6, ease: 'power2.inOut' }, '<0.3')
      .add(() => root.remove());
    root.addEventListener('click', () => tl.timeScale(4), { once: true });
  });
}
