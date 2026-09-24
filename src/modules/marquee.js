import { gsap } from 'gsap';
import { clamp, lerp } from '../lib/env.js';

/** Infinite rows whose speed follows scroll velocity and whose direction flips with it. */
export function initMarquee(scrollState, { reduce }) {
  const rows = [...document.querySelectorAll('[data-marquee]')];
  if (!rows.length || reduce) return;
  const state = rows.map((row) => {
    const track = row.querySelector('.marquee-track');
    const copies = Math.max(2, Math.ceil((window.innerWidth * 2) / track.offsetWidth) + 1);
    for (let i = 1; i < copies; i++) row.appendChild(track.cloneNode(true)).setAttribute('aria-hidden', 'true');
    return { tracks: [...row.querySelectorAll('.marquee-track')], dir: Number(row.dataset.marquee) || 1, x: 0, width: track.offsetWidth };
  });
  window.addEventListener('resize', () => state.forEach((s) => (s.width = s.tracks[0].offsetWidth)));
  const skewTo = gsap.quickTo(rows, 'skewX', { duration: 0.5, ease: 'power3' });
  let boost = 1;
  let flip = 1;
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(rows[0].parentElement);
  gsap.ticker.add((_, delta) => {
    if (!visible) return;
    const v = scrollState.velocity || 0;
    boost = lerp(boost, 1 + Math.min(Math.abs(v) * 0.25, 10), 0.1);
    if (Math.abs(v) > 0.5) flip = v > 0 ? 1 : -1;
    const dt = Math.min(delta, 50) / 1000;
    state.forEach((s) => {
      s.x -= 55 * s.dir * flip * boost * dt;
      if (s.x <= -s.width) s.x += s.width;
      if (s.x > 0) s.x -= s.width;
      s.tracks.forEach((t) => (t.style.transform = `translate3d(${s.x}px,0,0)`));
    });
    skewTo(clamp(-v * 0.3, -10, 10));
  });
}
