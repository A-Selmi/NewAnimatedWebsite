import { gsap } from 'gsap';

/** Blend-mode cursor: dot + trailing ring that swells (and labels itself) over interactive things. */
export function initCursor() {
  const cursor = document.querySelector('.cursor');
  if (!cursor) return;
  const dot = cursor.querySelector('.cursor-dot');
  const ring = cursor.querySelector('.cursor-ring');
  const label = cursor.querySelector('.cursor-label');
  document.documentElement.classList.add('has-cursor');

  gsap.set([dot, ring], { x: innerWidth / 2, y: innerHeight / 2 });
  const dotX = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power3' });
  const dotY = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power3' });
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      cursor.classList.remove('is-hidden');
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
    },
    { passive: true },
  );

  const interactive = 'a, button, [data-cursor], [data-card]';
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest(interactive);
    if (!t) return;
    const isCard = t.matches('[data-card]') && !t.matches('a, button');
    cursor.classList.toggle('is-hover', !isCard);
    const text = t.dataset.cursor || '';
    label.textContent = text;
    cursor.classList.toggle('has-label', Boolean(text));
  });
  document.addEventListener('pointerout', (e) => {
    const t = e.target.closest(interactive);
    if (!t || (e.relatedTarget && t.contains(e.relatedTarget))) return;
    const parent = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(interactive);
    if (parent) return;
    cursor.classList.remove('is-hover', 'has-label');
  });
  document.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
  document.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
  document.documentElement.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
}

/** Elements with [data-magnetic] lean toward the pointer and spring back. */
export function initMagnetic() {
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const strength = parseFloat(el.dataset.magnetic) || 0.35;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.35)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.35)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      xTo(x * strength);
      yTo(y * strength);
      // feed the liquid-fill origin on primary buttons
      el.style.setProperty('--bx', `${((e.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty('--by', `${((e.clientY - r.top) / r.height) * 100}%`);
    });
    el.addEventListener('pointerleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}
