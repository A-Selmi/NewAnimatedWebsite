import { gsap } from 'gsap';
import { finePointer } from '../lib/env.js';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const fmtDate = (d) => `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

function citizenId(name) {
  let h = 2166136261;
  for (const ch of name.toLowerCase()) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  const n = String(h % 100000000).padStart(8, '0');
  return `ZC-${n.slice(0, 4)}-${n.slice(4)}`;
}

function mrz(name) {
  const words = name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[^A-Z ]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const surname = words.length > 1 ? words[words.length - 1] : words[0] || 'MAYOR';
  const given = words.length > 1 ? words.slice(0, -1).join('<') : '';
  return `P<ZC<${surname}<<${given}`.padEnd(40, '<').slice(0, 40);
}

/** Live passport: type a name, pick a signature style, tilt and flip the card. */
export function initPassport({ reduce }) {
  const input = document.querySelector('[data-pp-input]');
  const card = document.querySelector('[data-pp-card]');
  if (!input || !card) return;
  const nameEl = card.querySelector('[data-pp-name]');
  const idEl = card.querySelector('[data-pp-id]');
  const sigEl = card.querySelector('[data-pp-sig]');
  const mrzEl = card.querySelector('[data-pp-mrz]');
  const styleBtns = [...document.querySelectorAll('[data-sig-style]')];
  const today = new Date();
  const expires = new Date(today);
  expires.setFullYear(today.getFullYear() + 10);
  card.querySelector('[data-pp-issued]').textContent = fmtDate(today);
  card.querySelector('[data-pp-expires]').textContent = fmtDate(expires);

  let style = 'cursive';
  let name = 'New Mayor';

  const renderSig = (animate) => {
    sigEl.classList.toggle('is-default', style === 'default');
    sigEl.classList.toggle('is-stamp', style === 'stamp');
    sigEl.textContent = style === 'default' ? '✓ Signed' : style === 'stamp' ? name.split(/\s+/)[0].slice(0, 12) : name;
    if (animate && !reduce) {
      if (style === 'cursive') gsap.fromTo(sigEl, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.7, ease: 'power1.inOut' });
      else gsap.fromTo(sigEl, { scale: 1.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'power4.in', clearProps: 'clipPath' });
    }
  };
  const update = (animate) => {
    name = input.value.trim() || 'New Mayor';
    nameEl.textContent = name;
    mrzEl.textContent = mrz(name);
    const id = citizenId(name);
    if (animate && !reduce) gsap.to(idEl, { duration: 0.6, scrambleText: { text: id, chars: '0123456789', speed: 0.8 } });
    else idEl.textContent = id;
    renderSig(animate);
  };
  let typing = null;
  input.addEventListener('input', () => {
    clearTimeout(typing);
    nameEl.textContent = input.value.trim() || 'New Mayor';
    typing = setTimeout(() => update(true), 350);
  });
  styleBtns.forEach((b) =>
    b.addEventListener('click', () => {
      style = b.dataset.sigStyle;
      styleBtns.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      renderSig(true);
    }),
  );
  update(false);

  // tilt + flip, smoothed in one place so they never fight
  const s = { rx: 0, ry: 0, trx: 0, tilt: 0, flip: 0, sx: 50 };
  const toggle = () => {
    s.flip = s.flip ? 0 : 180;
    if (reduce) gsap.set(card, { rotationY: s.flip });
  };
  card.addEventListener('click', toggle);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  });
  if (reduce) return;
  gsap.set(card, { transformPerspective: 1400 });
  gsap.to(card.parentElement, { y: -10, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  if (finePointer) {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      s.trx = (0.5 - py) * 14;
      s.tilt = (px - 0.5) * 18;
      s.sx = px * 100;
    });
    card.addEventListener('pointerleave', () => {
      s.trx = 0;
      s.tilt = 0;
    });
  }
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(card);
  gsap.ticker.add((time) => {
    if (!visible) return;
    const idle = finePointer ? 0 : Math.sin(time * 0.8) * 8;
    s.rx += (s.trx - s.rx) * 0.1;
    s.ry += (s.flip + s.tilt + idle - s.ry) * 0.08;
    gsap.set(card, { rotationX: s.rx, rotationY: s.ry });
    card.style.setProperty('--sx', `${s.sx}%`);
  });
}
