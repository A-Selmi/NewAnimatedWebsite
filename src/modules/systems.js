import { gsap } from 'gsap';
import { finePointer, whenVisible } from '../lib/env.js';

/** Bento of live mini-simulations. Each card's timeline only runs while it's on screen. */
export function initSystems({ reduce }) {
  const builders = { utilities, residents, quality, warehouse, recycle, rush };
  document.querySelectorAll('[data-sys]').forEach((card) => {
    const anim = builders[card.dataset.sys]?.(card, { reduce });
    if (!anim || reduce) return;
    whenVisible(card, (v) => (v ? anim.play() : anim.pause()));
  });

  // cursor spotlight + gentle 3D tilt
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
        rx((0.5 - py) * 6);
        ry((px - 0.5) * 8);
      }
    });
    card.addEventListener('pointerleave', () => {
      rx(0);
      ry(0);
    });
  });
}

const NS = 'http://www.w3.org/2000/svg';

/* Utilities: the coverage circle grows, houses inside it switch on. */
function utilities(card, { reduce }) {
  const svg = card.querySelector('[data-util-map]');
  const radius = card.querySelector('[data-util-radius]');
  const items = [...card.querySelectorAll('[data-util]')];
  const spots = [[60, 40], [200, 60], [240, 130], [70, 150], [320, 50], [370, 140], [180, 150], [300, 110]];
  const houses = spots.map(([x, y]) => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'util-house');
    g.setAttribute('transform', `translate(${x} ${y})`);
    g.innerHTML = '<path d="M-12 12V-2L0-12 12-2v14z"/><rect class="util-win" x="-4" y="0" width="8" height="8" rx="1"/>';
    svg.appendChild(g);
    return { g, d: Math.hypot(x - 120, y - 92) };
  });
  const state = { r: 0 };
  const paint = () => {
    radius.setAttribute('r', state.r);
    houses.forEach((h) => h.g.classList.toggle('is-on', h.d < state.r));
  };
  if (reduce) {
    state.r = 150;
    paint();
    items[0].classList.add('is-on');
    return null;
  }
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6, paused: true });
  tl.to(state, { r: 170, duration: 2.6, ease: 'power2.out', onUpdate: paint });
  items.forEach((li, i) => {
    tl.call(() => items.forEach((x, j) => x.classList.toggle('is-on', j === i)), null, i * 0.55);
  });
  tl.to(state, { r: 0, duration: 1, ease: 'power2.in', onUpdate: paint }, '+=0.8');
  return tl;
}

/* Residents: applications arrive, get stamped, move in. */
function residents(card, { reduce }) {
  const stack = card.querySelector('[data-apply-stack]');
  const count = card.querySelector('[data-apply-count]');
  const people = [
    ['The Haddad family', 'family of 4', '#ffd0c4', 'H'],
    ['Lina M.', 'lives alone', '#bfe6ff', 'L'],
    ['The Okafor family', 'family of 3', '#ffe29a', 'O'],
    ['Sami & Noor', 'couple', '#cdb4db', 'S'],
  ];
  const cards = people.map(([name, size, color, init]) => {
    const div = document.createElement('div');
    div.className = 'applicant';
    div.innerHTML = `<span class="applicant-av" style="--av:${color}">${init}</span><div><b>${name}</b><small>${size}</small></div><span class="applicant-stamp">APPROVED</span>`;
    stack.appendChild(div);
    return div;
  });
  if (reduce) {
    gsap.set(cards, { autoAlpha: 0 });
    gsap.set(cards[0], { autoAlpha: 1 });
    count.textContent = '1';
    return null;
  }
  gsap.set(cards, { autoAlpha: 0, x: 60 });
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6, paused: true });
  cards.forEach((c, i) => {
    tl.to(c, { autoAlpha: 1, x: 0, duration: 0.45, ease: 'back.out(1.8)' })
      .to(c.querySelector('.applicant-stamp'), { scale: 1, duration: 0.25, ease: 'back.out(3)' }, '+=0.5')
      .to(c, { y: 70, x: 30, autoAlpha: 0, scale: 0.8, duration: 0.45, ease: 'power2.in' }, '+=0.4')
      .call(() => (count.textContent = i + 1));
  });
  tl.set(cards, { x: 60, y: 0, scale: 1 })
    .set(cards.map((c) => c.querySelector('.applicant-stamp')), { scale: 0 })
    .call(() => (count.textContent = '0'), null, '+=0.8');
  return tl;
}

/* Quality tiers: one house, three finishes. */
function quality(card, { reduce }) {
  const house = card.querySelector('[data-quality-house]');
  const tiers = [...card.querySelectorAll('[data-tier]')];
  const set = (i) => {
    house.dataset.tierOn = i;
    tiers.forEach((t, j) => t.classList.toggle('is-on', i === j));
  };
  set(0);
  if (reduce) return null;
  const tl = gsap.timeline({ repeat: -1, paused: true });
  [1, 2, 0].forEach((i) => {
    tl.call(() => set(i), null, '+=1.6').fromTo(house, { scale: 0.94, transformOrigin: '50% 100%' }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  });
  return tl;
}

/* Warehouse: tall items along the walls, short ones in the middle, walkway clear. */
function warehouse(card, { reduce }) {
  const floor = card.querySelector('[data-ware-floor]');
  const bar = card.querySelector('[data-ware-bar]');
  const pct = card.querySelector('[data-ware-pct]');
  // [left%, top%, width%, height%, colour]  (tall = darker, along walls)
  const layout = [
    [3, 6, 9, 26, '#6b4430'],
    [3, 38, 9, 22, '#3b4163'],
    [88, 6, 9, 30, '#6b4430'],
    [88, 42, 9, 20, '#5b6fb5'],
    [3, 66, 9, 28, '#8a5a3b'],
    [88, 68, 9, 26, '#3b4163'],
    [16, 12, 22, 20, '#8e7cff'],
    [62, 12, 22, 16, '#ff9f7a'],
    [16, 40, 14, 14, '#ffd23f'],
    [62, 36, 16, 20, '#5bb6ff'],
    [16, 64, 20, 24, '#37b872'],
    [62, 64, 18, 22, '#e8c89e'],
  ];
  const boxes = layout.map(([l, t, w, h, c]) => {
    const b = document.createElement('span');
    b.className = 'ware-item';
    Object.assign(b.style, { left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, background: c });
    floor.appendChild(b);
    return b;
  });
  const fill = { v: 0 };
  const paint = () => {
    bar.style.width = `${fill.v}%`;
    pct.textContent = `${Math.round(fill.v)}%`;
  };
  if (reduce) {
    fill.v = 68;
    paint();
    return null;
  }
  gsap.set(boxes, { autoAlpha: 0, y: -24, scale: 0.8 });
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8, paused: true });
  boxes.forEach((b, i) => {
    tl.to(b, { autoAlpha: 1, y: 0, scale: 1, duration: 0.35, ease: 'bounce.out' }, i * 0.28);
  });
  tl.to(fill, { v: 68, duration: boxes.length * 0.28, ease: 'none', onUpdate: paint }, 0)
    .to(boxes, { autoAlpha: 0, scale: 0.8, duration: 0.3, stagger: 0.02 }, '+=1.6')
    .to(fill, { v: 0, duration: 0.5, onUpdate: paint }, '<');
  return tl;
}

/* Recycling tiers: the same month's garbage against three capacities. */
function recycle(card, { reduce }) {
  const tiers = [...card.querySelectorAll('[data-rc]')];
  const cover = card.querySelector('[data-rc-cover]');
  const over = card.querySelector('[data-rc-over]');
  const cap = card.querySelector('[data-rc-cap]');
  const capv = card.querySelector('[data-rc-capv]');
  const UNITS = 42;
  const CAPS = [30, 60, 150];
  const set = (i, instant) => {
    const c = CAPS[i];
    const max = Math.max(UNITS, c) * 1.08;
    tiers.forEach((t, j) => t.classList.toggle('is-on', i === j));
    capv.textContent = c;
    const d = instant ? 0 : 0.7;
    gsap.to(cover, { width: `${(Math.min(UNITS, c) / max) * 100}%`, duration: d, ease: 'power3.out' });
    gsap.to(over, { left: `${(Math.min(UNITS, c) / max) * 100}%`, width: `${(Math.max(0, UNITS - c) / max) * 100}%`, duration: d, ease: 'power3.out' });
    gsap.to(cap, { left: `${(c / max) * 100}%`, duration: d, ease: 'power3.out' });
  };
  set(0, true);
  if (reduce) return null;
  const tl = gsap.timeline({ repeat: -1, paused: true });
  [1, 2, 0].forEach((i) => tl.call(() => set(i), null, '+=2'));
  return tl;
}

/* Rush build: slow bar, then a rush (ad or +50%) zips it to done. */
function rush(card, { reduce }) {
  const fill = card.querySelector('[data-rush-fill]');
  const time = card.querySelector('[data-rush-time]');
  const left = card.querySelector('[data-rush-left]');
  const pay = card.querySelector('[data-rush-pay]');
  const ad = card.querySelector('[data-rush-ad]');
  if (reduce) {
    fill.style.width = '40%';
    return null;
  }
  let free = 3;
  const tl = gsap.timeline({ repeat: -1, paused: true, repeatDelay: 0.6 });
  tl.set(fill, { width: '0%' })
    .call(() => (time.textContent = '2d 14h'))
    .to(fill, { width: '34%', duration: 2.4, ease: 'none' })
    .call(() => {
      const btn = free > 0 ? ad : pay;
      btn.classList.add('is-press');
      setTimeout(() => btn.classList.remove('is-press'), 300);
      if (free > 0) free--;
      else free = 3;
      left.textContent = free;
    })
    .to(fill, { width: '100%', duration: 0.6, ease: 'expo.in' }, '+=0.3')
    .call(() => (time.textContent = 'Done ✓'))
    .to({}, { duration: 1.2 });
  return tl;
}
