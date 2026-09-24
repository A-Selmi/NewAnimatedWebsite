import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { finePointer, formatMB, rand, whenVisible } from '../lib/env.js';

/* ───────────────────────── Card hover FX + reveal ───────────────────────── */

export function initCardFX({ reduce }) {
  document.querySelectorAll('[data-card]').forEach((card) => {
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.7, ease: 'power3' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.7, ease: 'power3' });
    gsap.set(card, { transformPerspective: 1000 });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
      if (finePointer && !reduce) {
        rx((0.5 - py) * 7);
        ry((px - 0.5) * 9);
      }
    });
    card.addEventListener('pointerleave', () => {
      rx(0);
      ry(0);
    });
  });

  if (reduce) return;
  const cards = gsap.utils.toArray('.bento .card, .platform');
  gsap.set(cards, { opacity: 0, y: 90, scale: 0.94 });
  ScrollTrigger.batch(cards, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'expo.out', stagger: 0.09, overwrite: true }),
  });
}

/* ───────────────────────── Demo registry ───────────────────────── */

export function initDemos({ reduce }) {
  const builders = { bt, trackers, gauge, upnp, ua, notify, i18n, tray };
  document.querySelectorAll('[data-demo]').forEach((card) => {
    const build = builders[card.dataset.demo];
    const anim = build ? build(card, { reduce }) : null;
    if (reduce) return;
    whenVisible(card, (visible) => {
      card.classList.toggle('is-playing', visible);
      if (!anim) return;
      if (visible) anim.play();
      else anim.pause();
    });
  });
}

/* BitTorrent: files get ticked and unticked, the selected total counts up and down. */
function bt(card, { reduce }) {
  const items = [...card.querySelectorAll('.bt-list li')];
  const totalEl = card.querySelector('[data-bt-total]');
  const selected = new Set();
  const counter = { mb: 0 };
  const retotal = () => {
    const target = [...selected].reduce((sum, i) => sum + parseFloat(items[i].dataset.mb), 0);
    gsap.to(counter, {
      mb: target,
      duration: 0.6,
      ease: 'power2.out',
      overwrite: true,
      onUpdate: () => (totalEl.textContent = formatMB(counter.mb)),
    });
  };
  const toggle = (i, on) => () => {
    items.forEach((li) => li.classList.remove('is-hot'));
    items[i].classList.add('is-hot');
    items[i].classList.toggle('is-on', on);
    if (on) selected.add(i);
    else selected.delete(i);
    retotal();
  };
  if (reduce) {
    [0, 2, 3].forEach((i) => toggle(i, true)());
    return null;
  }
  const steps = [[0, true], [2, true], [3, true], [4, true], [1, true], [1, false], [4, false], [3, false], [0, false], [2, false]];
  const tl = gsap.timeline({ repeat: -1, paused: true });
  steps.forEach(([i, on]) => tl.call(toggle(i, on), null, '+=0.75'));
  tl.call(() => items.forEach((li) => li.classList.remove('is-hot')), null, '+=0.6');
  return tl;
}

/* Trackers: duplicate the list so the CSS ticker loops seamlessly. */
function trackers(card) {
  const list = card.querySelector('.trk-list');
  [...list.children].forEach((li) => list.appendChild(li.cloneNode(true)));
  const badge = card.querySelector('.trk-badge');
  return gsap
    .timeline({ repeat: -1, repeatDelay: 2.4, paused: true })
    .to(badge, { scale: 1.08, duration: 0.25, ease: 'power2.out' })
    .to(badge, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
}

/* Speed gauge: needle races up, a limit kicks in and clamps it, then releases. */
function gauge(card, { reduce }) {
  const needle = card.querySelector('[data-gauge-needle]');
  const fill = card.querySelector('[data-gauge-fill]');
  const readout = card.querySelector('[data-gauge-val]');
  const chip = card.querySelector('[data-gauge-chip]');
  const limit = card.querySelector('[data-gauge-limit]');
  const ticks = card.querySelector('[data-gauge-ticks]');

  const polar = (value, radius) => {
    const a = ((-120 + value * 2.4) * Math.PI) / 180;
    return [100 + radius * Math.sin(a), 100 - radius * Math.cos(a)];
  };
  for (let v = 0; v <= 100; v += 10) {
    const [x1, y1] = polar(v, 60);
    const [x2, y2] = polar(v, v % 50 === 0 ? 50 : 55);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    ticks.appendChild(line);
  }
  const [lx, ly] = polar(40, 80);
  gsap.set(limit, { x: lx, y: ly, scale: 0, transformOrigin: '50% 50%' });
  gsap.set(chip, { opacity: 0, y: 8 });

  const val = { v: 0 };
  const render = () => {
    gsap.set(needle, { rotation: -120 + val.v * 2.4, svgOrigin: '100 100' });
    gsap.set(fill, { drawSVG: `0% ${Math.max(val.v, 0.01)}%` });
    readout.textContent = Math.round(val.v);
  };
  render();
  if (reduce) {
    val.v = 40;
    render();
    return null;
  }

  const go = (v, duration, ease = 'sine.inOut') => ({ v, duration, ease, onUpdate: render });
  return gsap
    .timeline({ repeat: -1, repeatDelay: 0.6, paused: true })
    .to(val, go(94, 1.6, 'power3.out'))
    .to(val, go(86, 0.35))
    .to(val, go(97, 0.4))
    .to(val, go(90, 0.35))
    .to(chip, { opacity: 1, y: 0, duration: 0.4, ease: 'back.out(2)' })
    .to(limit, { scale: 1, duration: 0.5, ease: 'back.out(3)' }, '<')
    .to(val, go(40, 1, 'power3.inOut'))
    .to(val, go(42, 0.4))
    .to(val, go(39, 0.5))
    .to(val, go(40, 0.6))
    .to(chip, { opacity: 0, y: 8, duration: 0.3 }, '+=0.6')
    .to(limit, { scale: 0, duration: 0.3 }, '<')
    .to(val, go(0, 1.1, 'power2.inOut'));
}

/* UPnP: packets shuttle between device, router and internet; ports get remapped. */
function upnp(card, { reduce }) {
  const a = card.querySelector('[data-upnp-pa]');
  const b = card.querySelector('[data-upnp-pb]');
  const port = card.querySelector('[data-upnp-port]');
  const pathA = card.querySelector('#upnp-a');
  const pathB = card.querySelector('#upnp-b');
  const place = (el, path, progress) =>
    gsap.set(el, { motionPath: { path, align: path, alignOrigin: [0.5, 0.5], start: progress, end: progress } });
  if (reduce) {
    place(a, pathA, 0.5);
    place(b, pathB, 0.5);
    return null;
  }
  const tl = gsap.timeline({ repeat: -1, paused: true });
  tl.to(a, { duration: 1.1, ease: 'power1.inOut', motionPath: { path: pathA, align: pathA, alignOrigin: [0.5, 0.5] } })
    .to(a, { duration: 1.1, ease: 'power1.inOut', motionPath: { path: pathB, align: pathB, alignOrigin: [0.5, 0.5] } })
    .to(b, { duration: 1.1, ease: 'power1.inOut', motionPath: { path: pathB, align: pathB, alignOrigin: [0.5, 0.5], start: 1, end: 0 } }, 0.3)
    .to(b, { duration: 1.1, ease: 'power1.inOut', motionPath: { path: pathA, align: pathA, alignOrigin: [0.5, 0.5], start: 1, end: 0 } }, 1.4)
    .call(() => {
      const proto = Math.random() > 0.5 ? 'TCP' : 'UDP';
      const next = `${proto} ${Math.floor(rand(10000, 65000))}`;
      gsap.to(port, { duration: 0.6, scrambleText: { text: next, chars: '0123456789', speed: 0.8 } });
    }, null, 2.2);
  return tl;
}

/* User-Agent: the header value scrambles between client identities. */
function ua(card, { reduce }) {
  const el = card.querySelector('[data-ua]');
  const agents = ['Chrome', 'Firefox', 'Safari', 'Transmission', 'aria2', 'Edge'];
  if (reduce) return null;
  const tl = gsap.timeline({ repeat: -1, paused: true });
  agents.forEach((name, i) => {
    tl.to(el, {
      duration: 0.8,
      scrambleText: { text: agents[(i + 1) % agents.length], chars: 'lowerCase', speed: 0.7 },
      ease: 'none',
    }, '+=1.3');
  });
  el.textContent = agents[0];
  return tl;
}

/* Notifications: toasts slide in, stack, and fall away. */
function notify(card, { reduce }) {
  const stage = card.querySelector('[data-notify-stage]');
  const files = ['distro-24.04-desktop.iso', 'open-movie-collection-4k', 'podcast-archive-2026.zip', 'render-engine-4.2.tar.xz'];
  const toasts = files.map((name) => {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span class="toast-icon"><svg viewBox="0 0 24 24"><use href="#i-check"/></svg></span><div><b>Download complete</b><small>${name}</small></div>`;
    stage.appendChild(t);
    return t;
  });
  if (reduce) {
    gsap.set(toasts, { opacity: 0 });
    gsap.set(toasts[0], { opacity: 1, y: 14 });
    gsap.set(toasts[1], { opacity: 0.8, y: 88, scale: 0.96 });
    return null;
  }
  gsap.set(toasts, { y: -90, opacity: 0 });
  let idx = 0;
  const n = toasts.length;
  const cycle = () => {
    const t = toasts[idx % n];
    const prev = toasts[(idx - 1 + n) % n];
    const prev2 = toasts[(idx - 2 + n) % n];
    gsap.fromTo(t, { y: -90, opacity: 0, scale: 0.9 }, { y: 14, opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.6)' });
    if (idx > 0) gsap.to(prev, { y: 88, scale: 0.96, opacity: 0.75, duration: 0.8, ease: 'expo.out' });
    if (idx > 1) gsap.to(prev2, { y: 150, opacity: 0, duration: 0.6, ease: 'power2.in' });
    idx++;
  };
  return gsap.timeline({ repeat: -1, paused: true }).call(cycle, null, 0.3).call(() => {}, null, 2.2);
}

/* i18n: greetings flip over like a split-flap board. */
function i18n(card, { reduce }) {
  const word = card.querySelector('[data-i18n-word]');
  const lang = card.querySelector('[data-i18n-lang]');
  const words = [
    ['Hello', 'English'],
    ['مرحبا', 'العربية'],
    ['Bonjour', 'Français'],
    ['你好', '中文'],
    ['Hola', 'Español'],
    ['こんにちは', '日本語'],
    ['Merhaba', 'Türkçe'],
    ['Привет', 'Русский'],
    ['Olá', 'Português'],
    ['Hallo', 'Deutsch'],
  ];
  if (reduce) return null;
  const tl = gsap.timeline({ repeat: -1, paused: true });
  words.forEach(([w, l]) => {
    tl.call(() => {
      word.textContent = w;
      lang.textContent = l;
    })
      .fromTo(word, { yPercent: 70, rotateX: -95, opacity: 0 }, { yPercent: 0, rotateX: 0, opacity: 1, duration: 0.7, ease: 'expo.out', immediateRender: false })
      .fromTo(lang, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4, immediateRender: false }, '<0.1')
      .to(word, { yPercent: -70, rotateX: 95, opacity: 0, duration: 0.45, ease: 'power3.in' }, '+=1.1')
      .to(lang, { opacity: 0, duration: 0.3 }, '<');
  });
  return tl;
}

/* Tray: live-ish speeds and a real clock. */
function tray(card, { reduce }) {
  const down = card.querySelector('[data-tray-down]');
  const up = card.querySelector('[data-tray-up]');
  const clock = card.querySelector('[data-tray-clock]');
  const tick = () => {
    const now = new Date();
    clock.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    down.textContent = rand(18, 64).toFixed(1);
    up.textContent = rand(0.4, 3.2).toFixed(1);
  };
  tick();
  if (reduce) return null;
  return gsap.timeline({ repeat: -1, paused: true }).call(tick, null, 0.6);
}
