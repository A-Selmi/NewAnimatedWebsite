import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { finePointer } from '../lib/env.js';

/* Hero title: letters bounce up one by one. */
export function heroIntro() {
  const chars = gsap.utils
    .toArray('[data-hero-chars]')
    .flatMap((el) => new SplitText(el, { type: 'chars', charsClass: 'zt-char', aria: 'none' }).chars);
  return gsap
    .timeline({ paused: true })
    .from(chars, { yPercent: 120, rotation: () => gsap.utils.random(-25, 25), scale: 0.6, opacity: 0, duration: 1.1, ease: 'back.out(2.2)', stagger: 0.06 })
    .from('[data-hero-in]', { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.1 }, 0.25)
    .from('.crumbs, .hud-top, .zoom-rail', { y: -20, opacity: 0, duration: 0.7, ease: 'expo.out', stagger: 0.08 }, 0.5);
}

/* Section headings split into masked lines; other blocks fade up. */
export function initReveals({ reduce }) {
  if (reduce) return;
  gsap.utils.toArray('[data-split]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 115,
          rotation: 3,
          transformOrigin: '0% 100%',
          duration: 1.2,
          ease: 'expo.out',
          stagger: 0.12,
          scrollTrigger: { trigger: el, start: 'top 86%', once: true },
        }),
    });
  });
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.from(el, { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  gsap.utils.toArray('.bento .card').forEach((el, i) => {
    gsap.from(el, { y: 70, opacity: 0, scale: 0.95, duration: 1.1, ease: 'expo.out', delay: (i % 2) * 0.08, scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  });
}

/* Road progress bar with a little car + nav behaviour. */
export function initNav() {
  const nav = document.querySelector('.nav');
  const road = document.querySelector('.road');
  const car = road.querySelector('.road-car');
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      gsap.set(car, { x: self.progress * (window.innerWidth - 36) });
      road.classList.toggle('is-active', self.progress > 0.005);
      nav.classList.toggle('is-hidden', self.direction === 1 && self.scroll() > 300);
    },
  });
  document.querySelectorAll('.nav-links a').forEach((link) => {
    const section = document.querySelector(link.getAttribute('href'));
    if (!section) return;
    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => link.classList.toggle('is-active', self.isActive),
    });
  });
}

/* Day/night switch with a circular reveal from the click point. */
export function initTheme({ reduce, onChange }) {
  const meta = document.querySelector('meta[name="theme-color"]');
  const sync = () => {
    const night = document.documentElement.dataset.theme === 'night';
    if (meta) meta.content = night ? '#0d1330' : '#fbf6ee';
    document.querySelectorAll('[data-theme-toggle]').forEach((b) => (b.dataset.cursor = night ? 'Day' : 'Night'));
  };
  sync();
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) =>
    btn.addEventListener('click', (e) => {
      const next = document.documentElement.dataset.theme === 'night' ? 'day' : 'night';
      const r = btn.getBoundingClientRect();
      const x = e.clientX || r.left + r.width / 2;
      const y = e.clientY || r.top + r.height / 2;
      const apply = () => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem('zoomcity-theme', next);
        } catch (err) {
          /* storage unavailable: theme still applies for this visit */
        }
        sync();
        onChange && onChange(next);
      };
      if (!document.startViewTransition || reduce) {
        apply();
        return;
      }
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      document.startViewTransition(apply).ready.then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 900, easing: 'cubic-bezier(.7,0,.2,1)', pseudoElement: '::view-transition-new(root)' },
        );
      });
    }),
  );
}

/* Roadmap: counters, the timeline line drawing itself, nodes popping. */
export function initRoadmap({ reduce }) {
  document.querySelectorAll('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const pre = el.dataset.prefix || '';
    const suf = el.dataset.suffix || '';
    const fmt = (v) => `${pre}${Math.round(v).toLocaleString('en-US')}${suf}`;
    if (reduce) {
      el.textContent = fmt(to);
      return;
    }
    const o = { v: 0 };
    el.textContent = fmt(0);
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => gsap.to(o, { v: to, duration: 2, ease: 'expo.out', onUpdate: () => (el.textContent = fmt(o.v)) }),
    });
  });
  const fill = document.querySelector('[data-tl-fill]');
  if (!fill) return;
  if (reduce) {
    gsap.set(fill, { scaleY: 0.4 });
    return;
  }
  gsap.to(fill, { scaleY: 0.42, ease: 'none', scrollTrigger: { trigger: '[data-timeline]', start: 'top 70%', end: 'center 50%', scrub: 0.6 } });
  gsap.utils.toArray('.tl-item').forEach((item) => {
    gsap.from(item.querySelector('.tl-card'), { x: 60, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: item, start: 'top 85%', once: true } });
    gsap.from(item.querySelector('.tl-node'), { scale: 0, duration: 0.7, ease: 'back.out(3)', scrollTrigger: { trigger: item, start: 'top 85%', once: true } });
  });
  gsap.from('.tl-list li', { x: -12, opacity: 0, stagger: 0.07, duration: 0.5, ease: 'power2.out', scrollTrigger: { trigger: '.tl-list', start: 'top 85%', once: true } });
}

/* Share button: native share sheet, or copy the link. */
export function initShare() {
  const btn = document.querySelector('[data-share]');
  if (!btn) return;
  const label = btn.querySelector('[data-share-label]');
  btn.addEventListener('click', async () => {
    const data = { title: 'ZoomCity', text: 'A city builder where you zoom from the whole city into every room.', url: location.href };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(location.href);
      label.textContent = 'Link copied ✓';
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      label.textContent = 'Copy the URL above';
    }
    setTimeout(() => (label.textContent = 'Share ZoomCity'), 2000);
  });
}

/* Footer wordmark: letters rise in, then zoom up near the cursor. */
export function initWordmark({ reduce }) {
  const el = document.querySelector('[data-wordmark]');
  if (!el) return;
  const letters = [...el.textContent.trim()].map((ch) => {
    const s = document.createElement('span');
    s.textContent = ch;
    s.setAttribute('aria-hidden', 'true');
    return s;
  });
  el.textContent = '';
  letters.forEach((s) => el.appendChild(s));
  if (reduce) return;
  gsap.from(letters, {
    yPercent: 110,
    rotation: () => gsap.utils.random(-30, 30),
    opacity: 0,
    duration: 1.2,
    ease: 'back.out(2)',
    stagger: 0.06,
    scrollTrigger: { trigger: el, start: 'top 95%', once: true },
  });
  if (!finePointer) return;
  let rects = [];
  el.addEventListener('pointerenter', () => (rects = letters.map((s) => s.getBoundingClientRect())));
  el.addEventListener('pointermove', (e) => {
    letters.forEach((s, i) => {
      const r = rects[i];
      if (!r) return;
      const d = Math.min(1, Math.abs(e.clientX - (r.left + r.width / 2)) / (r.width * 1.8));
      gsap.to(s, { scale: 1 + (1 - d) * 0.35, y: -(1 - d) * 16, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
    });
  });
  el.addEventListener('pointerleave', () => gsap.to(letters, { scale: 1, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' }));
}
