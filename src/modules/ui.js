import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { detectOS, finePointer } from '../lib/env.js';

/* ───────────────────────── Text + block reveals ───────────────────────── */

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
          rotate: 2.5,
          transformOrigin: '0% 100%',
          duration: 1.3,
          ease: 'expo.out',
          stagger: 0.12,
          scrollTrigger: { trigger: el, start: 'top 86%', once: true },
        }),
    });
  });
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 44,
      opacity: 0,
      duration: 1.2,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
}

/* ───────────────────────── Stats counters ───────────────────────── */

export function initStats({ reduce }) {
  document.querySelectorAll('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const from = Number(el.dataset.from ?? 0);
    if (reduce) {
      el.textContent = to;
      return;
    }
    const o = { v: from };
    el.textContent = from;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () =>
        gsap.to(o, { v: to, duration: 2.2, ease: 'expo.out', onUpdate: () => (el.textContent = Math.round(o.v)) }),
    });
  });
}

/* ───────────────────────── Nav + page progress ───────────────────────── */

export function initNav() {
  const nav = document.querySelector('.nav');
  const bar = document.querySelector('.page-progress');
  const fill = bar.querySelector('.page-progress-fill');
  const pct = bar.querySelector('[data-page-pct]');
  const setFill = gsap.quickSetter(fill, 'scaleX');

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      setFill(self.progress);
      pct.textContent = Math.round(self.progress * 100);
      bar.classList.toggle('is-active', self.progress > 0.01 && self.progress < 0.995);
      nav.classList.toggle('is-hidden', self.direction === 1 && self.scroll() > 240);
    },
  });

  const links = [...document.querySelectorAll('.nav-links a')];
  links.forEach((link) => {
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

/* ───────────────────────── Theme (circular view-transition reveal) ───────────────────────── */

export function initTheme({ reduce }) {
  const meta = document.querySelector('meta[name="theme-color"]');
  const sync = () => {
    const light = document.documentElement.dataset.theme === 'light';
    if (meta) meta.content = light ? '#f4f4fb' : '#07070c';
  };
  sync();
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      const r = btn.getBoundingClientRect();
      const x = e.clientX || r.left + r.width / 2;
      const y = e.clientY || r.top + r.height / 2;
      const apply = () => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem('motrix-theme', next);
        } catch (err) {
          /* storage unavailable: theme still applies for this visit */
        }
        sync();
        window.dispatchEvent(new CustomEvent('themechange', { detail: next }));
      };
      if (!document.startViewTransition || reduce) {
        apply();
        return;
      }
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const vt = document.startViewTransition(apply);
      vt.ready.then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 850, easing: 'cubic-bezier(.7,0,.2,1)', pseudoElement: '::view-transition-new(root)' },
        );
      });
    });
  });
}

/* ───────────────────────── Download: OS detection + terminal ───────────────────────── */

export function initDownload({ reduce }) {
  const os = detectOS();
  const names = { mac: 'macOS', windows: 'Windows', linux: 'Linux' };
  document.querySelectorAll('[data-os-name]').forEach((el) => (el.textContent = names[os] || 'desktop'));
  const card = document.querySelector(`.platform[data-os="${os}"]`);
  (card || document.querySelector('.platform[data-os="mac"]')).classList.add('is-recommended');

  const term = document.querySelector('[data-terminal]');
  if (!term) return;
  const tabs = [...term.querySelectorAll('[data-cmd]')];
  const text = term.querySelector('[data-term-text]');
  const copy = term.querySelector('[data-copy]');
  let current = tabs[0].dataset.cmd;

  const type = (cmd) => {
    current = cmd;
    gsap.killTweensOf(text);
    if (reduce) {
      text.textContent = cmd;
      return;
    }
    text.textContent = '';
    gsap.to(text, { duration: cmd.length * 0.035, text: { value: cmd }, ease: 'none' });
  };
  const select = (tab) => {
    tabs.forEach((t) => {
      t.setAttribute('aria-selected', String(t === tab));
      t.tabIndex = t === tab ? 0 : -1;
    });
    type(tab.dataset.cmd);
  };
  tabs.forEach((tab, i) => {
    tab.tabIndex = i === 0 ? 0 : -1;
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus();
      select(next);
    });
  });
  ScrollTrigger.create({ trigger: term, start: 'top 90%', once: true, onEnter: () => type(current) });
  if (reduce) text.textContent = current;

  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(current);
      copy.textContent = 'Copied ✓';
      copy.classList.add('is-copied');
    } catch (err) {
      copy.textContent = 'Select & copy';
    }
    setTimeout(() => {
      copy.textContent = 'Copy';
      copy.classList.remove('is-copied');
    }, 1800);
  });
}

/* ───────────────────────── Footer wordmark ───────────────────────── */

export function initWordmark({ reduce }) {
  const el = document.querySelector('[data-wordmark]');
  if (!el) return;
  const letters = [...el.textContent.trim()].map((ch) => {
    const span = document.createElement('span');
    span.textContent = ch;
    span.setAttribute('aria-hidden', 'true');
    return span;
  });
  el.textContent = '';
  letters.forEach((s) => el.appendChild(s));
  if (reduce) return;

  gsap.from(letters, {
    yPercent: 100,
    opacity: 0,
    rotateX: -80,
    transformPerspective: 800,
    transformOrigin: '50% 100%',
    duration: 1.6,
    ease: 'expo.out',
    stagger: 0.07,
    scrollTrigger: { trigger: el, start: 'top 95%', once: true },
  });

  if (!finePointer) return;
  let rects = [];
  const measure = () => (rects = letters.map((s) => s.getBoundingClientRect()));
  el.addEventListener('pointerenter', measure);
  el.addEventListener('pointermove', (e) => {
    letters.forEach((s, i) => {
      const r = rects[i];
      if (!r) return;
      const d = Math.min(1, Math.abs(e.clientX - (r.left + r.width / 2)) / (r.width * 2.2));
      gsap.to(s, {
        fontVariationSettings: `'wght' ${Math.round(900 - (1 - d) * 700)}`,
        y: -(1 - d) * 18,
        duration: 0.5,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    });
  });
  el.addEventListener('pointerleave', () => {
    gsap.to(letters, { fontVariationSettings: "'wght' 800", y: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)', overwrite: 'auto' });
  });
}
