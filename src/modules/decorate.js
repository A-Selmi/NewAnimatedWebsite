import { gsap } from 'gsap';
import { whenVisible } from '../lib/env.js';

/*
 * A playable slice of ZoomCity's interior decoration: pick an item, move the ghost,
 * green = fits, red = blocked (door swing, window, another item). Click to place,
 * R to rotate, undo/redo, and the two clear-room buttons (to storage / delete).
 */

const COLS = 12;
const ROWS = 8;
const CELL = 40;
const OX = 20;
const OY = 20;
const SWING = { x: 9, y: 6, w: 2, h: 2 };
const WIN = { x: 4, w: 3 };
const NS = 'http://www.w3.org/2000/svg';

const CATALOG = [
  { type: 'sofa', name: 'Sofa', w: 3, h: 1, price: 1200, sound: 'soft cloth drop', variants: ['#8e7cff', '#ff9f7a', '#5bb6ff'] },
  { type: 'armchair', name: 'Armchair', w: 1, h: 1, price: 450, sound: 'soft cloth drop', variants: ['#ffb020', '#37b872', '#ff6b4a'] },
  { type: 'table', name: 'Coffee table', w: 2, h: 1, price: 340, sound: 'wood thud', variants: ['#c79a6b', '#8a5a3b', '#e8c89e'] },
  { type: 'shelf', name: 'Bookshelf', w: 2, h: 1, price: 520, sound: 'wood thud', variants: ['#8a5a3b', '#3b4163', '#d9b98f'] },
  { type: 'lamp', name: 'Floor lamp', w: 1, h: 1, price: 95, sound: 'metal clink', variants: ['#ffd23f', '#3b4163', '#ff6b4a'] },
  { type: 'plant', name: 'Plant', w: 1, h: 1, price: 60, sound: 'ceramic tap', variants: ['#37b872', '#2f7a64', '#7cc47f'] },
];
const NAMES = { tv: 'TV unit', ...Object.fromEntries(CATALOG.map((c) => [c.type, c.name.toLowerCase()])) };
const START = [
  { uid: 1, type: 'tv', x: 0, y: 2, w: 1, h: 3, color: '#3b4163', price: 0 },
  { uid: 2, type: 'plant', x: 11, y: 0, w: 1, h: 1, color: '#37b872', price: 0 },
];

const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
  if (parent) parent.appendChild(n);
  return n;
};
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function initDecorate({ reduce }) {
  const svg = document.querySelector('[data-plan]');
  const list = document.querySelector('[data-catalog]');
  if (!svg || !list) return;
  const toastEl = document.querySelector('[data-plan-toast]');
  const spendEl = document.querySelector('[data-spend]');
  const storageEl = document.querySelector('[data-storage-count]');
  const storageBadge = document.querySelector('[data-plan-storage]');
  const buttons = Object.fromEntries([...document.querySelectorAll('[data-act]')].map((b) => [b.dataset.act, b]));

  let state = { items: START.map((i) => ({ ...i })), storage: 0, spend: 0 };
  let uid = 10;
  const history = [];
  const future = [];
  const sel = { type: 'sofa', variant: 0, rot: false };
  const ghost = { x: 3, y: 5 };
  let lastReason = '';
  let autoplay = !reduce;
  const spendView = { v: 0 };

  /* ── static room ── */
  el('rect', { x: OX, y: OY, width: COLS * CELL, height: ROWS * CELL, class: 'floor' }, svg);
  const grid = el('g', {}, svg);
  for (let c = 1; c < COLS; c++) el('line', { x1: OX + c * CELL, y1: OY, x2: OX + c * CELL, y2: OY + ROWS * CELL, class: 'grid-line' }, grid);
  for (let r = 1; r < ROWS; r++) el('line', { x1: OX, y1: OY + r * CELL, x2: OX + COLS * CELL, y2: OY + r * CELL, class: 'grid-line' }, grid);
  const hx = OX + SWING.x * CELL;
  const hy = OY + ROWS * CELL;
  const R = SWING.w * CELL;
  el('path', { d: `M${hx} ${hy} L${hx + R} ${hy} A${R} ${R} 0 0 0 ${hx} ${hy - R} Z`, class: 'door-swing' }, svg);
  const X0 = OX;
  const X1 = OX + COLS * CELL;
  const Y0 = OY;
  const Y1 = OY + ROWS * CELL;
  const wx0 = OX + WIN.x * CELL;
  const wx1 = OX + (WIN.x + WIN.w) * CELL;
  el('path', { d: `M${wx0} ${Y0} H${X0} V${Y1} H${hx} M${hx + R} ${Y1} H${X1} V${Y0} H${wx1}`, class: 'wall' }, svg);
  el('line', { x1: wx0, y1: Y0, x2: wx1, y2: Y0, class: 'window' }, svg);
  el('line', { x1: wx0 + 4, y1: Y0, x2: wx1 - 4, y2: Y0, class: 'window-glass' }, svg);
  el('line', { x1: hx, y1: hy, x2: hx, y2: hy - R, class: 'door-leaf' }, svg);
  el('text', { x: (wx0 + wx1) / 2, y: 11, 'text-anchor': 'middle', class: 'label' }, svg).textContent = 'window';
  el('text', { x: hx + R / 2, y: Y1 + 17, 'text-anchor': 'middle', class: 'label' }, svg).textContent = 'door';
  const itemsLayer = el('g', {}, svg);
  const fxLayer = el('g', {}, svg);
  const ghostLayer = el('g', { class: 'ghost' }, svg);

  /* ── drawing ── */
  function drawItem(g, it) {
    g.textContent = '';
    const px = OX + it.x * CELL + 3;
    const py = OY + it.y * CELL + 3;
    const pw = it.w * CELL - 6;
    const ph = it.h * CELL - 6;
    const wide = pw >= ph;
    el('rect', { x: px, y: py, width: pw, height: ph, rx: 8, fill: it.color, class: 'body' }, g);
    const dark = (x, y, w, h, rx = 3) => el('rect', { x, y, width: w, height: h, rx, class: 'detail-dark' }, g);
    const light = (x, y, w, h, rx = 3) => el('rect', { x, y, width: w, height: h, rx, class: 'detail' }, g);
    switch (it.type) {
      case 'sofa':
      case 'armchair':
        if (wide) {
          dark(px + 2, py + 2, pw - 4, 9);
          dark(px + 2, py + 2, 7, ph - 4);
          dark(px + pw - 9, py + 2, 7, ph - 4);
          if (it.type === 'sofa') for (let i = 1; i < 3; i++) light(px + (pw / 3) * i - 1, py + 13, 2, ph - 17, 1);
        } else {
          dark(px + 2, py + 2, 9, ph - 4);
          dark(px + 2, py + 2, pw - 4, 7);
          dark(px + 2, py + ph - 9, pw - 4, 7);
          if (it.type === 'sofa') for (let i = 1; i < 3; i++) light(px + 13, py + (ph / 3) * i - 1, pw - 17, 2, 1);
        }
        break;
      case 'table':
        light(px + 6, py + 6, pw - 12, ph - 12, 5);
        break;
      case 'shelf': {
        const n = Math.floor((wide ? pw : ph) / 9);
        const books = ['#ff6b4a', '#ffd23f', '#5bb6ff', '#37b872', '#fff'];
        for (let i = 0; i < n; i++) {
          const a = 4 + i * 9;
          el('rect', wide ? { x: px + a, y: py + 5, width: 6, height: ph - 10, rx: 1.5 } : { x: px + 5, y: py + a, width: pw - 10, height: 6, rx: 1.5 }, g).setAttribute('fill', books[i % books.length]);
        }
        break;
      }
      case 'lamp':
        el('circle', { cx: px + pw / 2, cy: py + ph / 2, r: Math.min(pw, ph) / 2 - 3, class: 'detail' }, g);
        el('circle', { cx: px + pw / 2, cy: py + ph / 2, r: 5, fill: '#fff7d6' }, g);
        break;
      case 'plant':
        el('circle', { cx: px + pw / 2 - 5, cy: py + ph / 2 - 3, r: 9, class: 'detail-dark' }, g);
        el('circle', { cx: px + pw / 2 + 5, cy: py + ph / 2 + 2, r: 9, class: 'detail' }, g);
        el('circle', { cx: px + pw / 2, cy: py + ph / 2, r: 4, fill: '#ff6b4a' }, g);
        break;
      case 'tv':
        el('rect', { x: px + pw - 8, y: py + 6, width: 4, height: ph - 12, rx: 2, fill: '#9cc6e6' }, g);
        break;
      default:
    }
  }

  const itemGroups = new Map();
  function renderItems(animateUid) {
    const keep = new Set(state.items.map((i) => i.uid));
    itemGroups.forEach((g, id) => {
      if (!keep.has(id)) {
        g.remove();
        itemGroups.delete(id);
      }
    });
    state.items.forEach((it) => {
      let g = itemGroups.get(it.uid);
      if (!g) {
        g = el('g', { class: 'item' }, itemsLayer);
        itemGroups.set(it.uid, g);
      }
      drawItem(g, it);
      if (it.uid === animateUid && !reduce) {
        gsap.fromTo(g, { scale: 0.5, y: -14, transformOrigin: '50% 50%' }, { scale: 1, y: 0, duration: 0.55, ease: 'back.out(3)', clearProps: 'transform' });
      }
    });
    storageEl.textContent = state.storage;
    gsap.to(spendView, { v: state.spend, duration: reduce ? 0 : 0.6, ease: 'power2.out', onUpdate: () => (spendEl.textContent = Math.round(spendView.v).toLocaleString('en-US')) });
    buttons.undo.disabled = history.length === 0;
    buttons.redo.disabled = future.length === 0;
  }

  const current = () => {
    const c = CATALOG.find((x) => x.type === sel.type);
    return { ...c, w: sel.rot ? c.h : c.w, h: sel.rot ? c.w : c.h, color: c.variants[sel.variant] };
  };
  const clampGhost = () => {
    const c = current();
    ghost.x = Math.max(0, Math.min(COLS - c.w, ghost.x));
    ghost.y = Math.max(0, Math.min(ROWS - c.h, ghost.y));
  };
  function validate() {
    const c = current();
    const r = { x: ghost.x, y: ghost.y, w: c.w, h: c.h };
    if (overlaps(r, SWING)) return 'Blocks the door swing';
    if (r.y === 0 && r.x <= WIN.x && r.x + r.w >= WIN.x + WIN.w) return 'Covers the window';
    const hit = state.items.find((i) => overlaps(r, i));
    if (hit) return `Bumps into the ${NAMES[hit.type]}`;
    return '';
  }
  function renderGhost() {
    clampGhost();
    const c = current();
    drawItem(ghostLayer, { ...c, x: ghost.x, y: ghost.y });
    el('rect', { x: OX + ghost.x * CELL + 1, y: OY + ghost.y * CELL + 1, width: c.w * CELL - 2, height: c.h * CELL - 2, rx: 9, class: 'outline' }, ghostLayer);
    const reason = validate();
    ghostLayer.classList.toggle('is-bad', Boolean(reason));
    ghostLayer.classList.toggle('is-ok', !reason);
    if (reason !== lastReason) {
      lastReason = reason;
      if (reason) toast(reason, 'bad', 0);
      else hideToast();
    }
  }

  let toastTimer = null;
  function toast(msg, kind, ms = 1800) {
    toastEl.textContent = msg;
    toastEl.classList.remove('is-ok', 'is-bad');
    if (kind) toastEl.classList.add(`is-${kind}`);
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    if (ms) toastTimer = setTimeout(hideToast, ms);
  }
  function hideToast() {
    toastEl.classList.remove('is-on');
  }

  /* ── actions ── */
  const snapshot = () => JSON.parse(JSON.stringify(state));
  function commit() {
    history.push(snapshot());
    if (history.length > 50) history.shift();
    future.length = 0;
  }
  function place() {
    const reason = validate();
    if (reason) {
      toast(reason, 'bad');
      if (!reduce) gsap.fromTo(ghostLayer, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1.2, 0.3)' });
      return false;
    }
    const c = current();
    commit();
    const item = { uid: ++uid, type: c.type, x: ghost.x, y: ghost.y, w: c.w, h: c.h, color: c.color, price: c.price };
    state.items.push(item);
    state.spend += c.price;
    renderItems(item.uid);
    lastReason = '__';
    renderGhost();
    toast(`Placed · ${c.sound}`, 'ok');
    ripple(item);
    return true;
  }
  function ripple(it) {
    if (reduce) return;
    const cx = OX + (it.x + it.w / 2) * CELL;
    const cy = OY + (it.y + it.h / 2) * CELL;
    const ring = el('circle', { cx, cy, r: 10, fill: 'none', stroke: it.color, 'stroke-width': 4 }, fxLayer);
    gsap.to(ring, { attr: { r: 60 }, opacity: 0, duration: 0.7, ease: 'power2.out', onComplete: () => ring.remove() });
  }
  function undo() {
    if (!history.length) return;
    future.push(snapshot());
    state = history.pop();
    renderItems();
    renderGhost();
    toast('Undone', '', 1000);
  }
  function redo() {
    if (!future.length) return;
    history.push(snapshot());
    state = future.pop();
    renderItems();
    renderGhost();
    toast('Redone', '', 1000);
  }
  function rotate() {
    sel.rot = !sel.rot;
    renderGhost();
    if (!reduce) gsap.fromTo(ghostLayer, { rotation: -20, transformOrigin: '50% 50%' }, { rotation: 0, duration: 0.4, ease: 'back.out(3)' });
  }
  function clearRoom(toStorage) {
    if (!state.items.length) {
      toast('The room is already empty', '', 1400);
      return;
    }
    commit();
    const groups = [...itemGroups.values()];
    const count = state.items.length;
    const finish = () => {
      if (toStorage) state.storage += count;
      state.items = [];
      renderItems();
      renderGhost();
      toast(toStorage ? `${count} items sent to the warehouse` : `${count} items deleted for good`, toStorage ? 'ok' : 'bad');
      if (toStorage && !reduce) gsap.fromTo(storageBadge, { scale: 1.25 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
    };
    if (reduce) return finish();
    if (toStorage) {
      const s = svg.getBoundingClientRect();
      const b = storageBadge.getBoundingClientRect();
      const k = 520 / s.width;
      const tx = (b.left + b.width / 2 - s.left) * k;
      const ty = (b.top + b.height / 2 - s.top) * k;
      groups.forEach((g, i) => {
        const bb = g.getBBox();
        gsap.to(g, { x: tx - (bb.x + bb.width / 2), y: ty - (bb.y + bb.height / 2), scale: 0.2, opacity: 0, transformOrigin: '50% 50%', duration: 0.6, delay: i * 0.05, ease: 'power3.in' });
      });
      gsap.delayedCall(0.6 + groups.length * 0.05, finish);
    } else {
      groups.forEach((g, i) => gsap.to(g, { scale: 0, rotation: 25, opacity: 0, transformOrigin: '50% 50%', duration: 0.4, delay: i * 0.04, ease: 'back.in(2)' }));
      gsap.delayedCall(0.4 + groups.length * 0.04, finish);
    }
  }

  /* ── catalogue ── */
  CATALOG.forEach((c) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" class="cat-item" data-type="${c.type}" data-cursor="Pick">
      <span class="cat-thumb"><i style="--c:${c.variants[0]};width:${c.w * 11}px;height:${c.h * 11}px"></i></span>
      <span><span class="cat-name">${c.name}</span><span class="cat-meta">$${c.price.toLocaleString('en-US')} · ${c.w}×${c.h}</span></span>
      <span class="cat-variants">${c.variants.map((v, i) => `<span style="--v:${v}" data-variant="${i}" title="Colour ${i + 1}"></span>`).join('')}</span>
    </button>`;
    list.appendChild(li);
  });
  const catButtons = [...list.querySelectorAll('.cat-item')];
  function select(type, variant = 0) {
    sel.type = type;
    sel.variant = variant;
    sel.rot = false;
    catButtons.forEach((b) => {
      const on = b.dataset.type === type;
      b.classList.toggle('is-selected', on);
      b.setAttribute('aria-pressed', String(on));
      b.querySelectorAll('[data-variant]').forEach((v) => v.classList.toggle('is-on', on && Number(v.dataset.variant) === variant));
      if (on) b.querySelector('.cat-thumb i').style.setProperty('--c', CATALOG.find((c) => c.type === type).variants[variant]);
    });
    lastReason = '__';
    renderGhost();
  }
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-item');
    if (!btn) return;
    stopAutoplay();
    const v = e.target.closest('[data-variant]');
    select(btn.dataset.type, v ? Number(v.dataset.variant) : btn.dataset.type === sel.type ? sel.variant : 0);
    if (!reduce) gsap.fromTo(btn, { scale: 0.96 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
  });

  /* ── pointer + keyboard ── */
  const toCell = (clientX, clientY) => {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const c = current();
    return { x: Math.floor((p.x - OX) / CELL) - Math.floor((c.w - 1) / 2), y: Math.floor((p.y - OY) / CELL) - Math.floor((c.h - 1) / 2) };
  };
  let hovering = false;
  svg.addEventListener('pointerenter', () => {
    hovering = true;
    stopAutoplay();
  });
  svg.addEventListener('pointerleave', () => {
    hovering = false;
    lastReason = '';
    hideToast();
  });
  svg.addEventListener('pointermove', (e) => {
    const c = toCell(e.clientX, e.clientY);
    if (c.x === ghost.x && c.y === ghost.y) return;
    ghost.x = c.x;
    ghost.y = c.y;
    renderGhost();
  });
  svg.addEventListener('pointerdown', (e) => {
    stopAutoplay();
    const c = toCell(e.clientX, e.clientY);
    ghost.x = c.x;
    ghost.y = c.y;
    renderGhost();
  });
  svg.addEventListener('click', () => place());
  svg.addEventListener('keydown', (e) => {
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      stopAutoplay();
      ghost.x += moves[e.key][0];
      ghost.y += moves[e.key][1];
      renderGhost();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      place();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.matches && e.target.matches('input, textarea')) return;
    if ((e.key === 'r' || e.key === 'R') && (hovering || document.activeElement === svg)) rotate();
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && (hovering || document.activeElement === svg)) {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
  });
  buttons.undo.addEventListener('click', () => (stopAutoplay(), undo()));
  buttons.redo.addEventListener('click', () => (stopAutoplay(), redo()));
  buttons.rotate.addEventListener('click', () => (stopAutoplay(), rotate()));
  buttons.store.addEventListener('click', () => (stopAutoplay(), clearRoom(true)));
  buttons.delete.addEventListener('click', () => (stopAutoplay(), clearRoom(false)));

  select('sofa', 0);
  renderItems();

  /* ── autoplay demo until someone touches it ── */
  const calls = [];
  function stopAutoplay() {
    if (!autoplay) return;
    autoplay = false;
    calls.forEach((c) => c.kill());
    calls.length = 0;
  }
  const wait = (t, fn) => calls.push(gsap.delayedCall(t, () => autoplay && fn()));
  const glide = (tx, ty, at) => {
    const steps = [];
    let x = ghost.x;
    let y = ghost.y;
    let t = at;
    while (x !== tx || y !== ty) {
      if (x !== tx) x += Math.sign(tx - x);
      else y += Math.sign(ty - y);
      steps.push([x, y]);
    }
    steps.forEach(([sx, sy], i) =>
      wait(t + i * 0.08, () => {
        ghost.x = sx;
        ghost.y = sy;
        renderGhost();
      }),
    );
    return t + steps.length * 0.08;
  };
  function runDemo() {
    if (!autoplay) return;
    ghost.x = 4;
    ghost.y = 4;
    let t = 0.6;
    wait(t, () => select('sofa', 0));
    // glide targets are computed as we go, so chain via nested waits
    wait(t + 0.2, () => {
      let at = glide(8, 6, 0);
      wait(at + 1.1, () => {
        at = glide(4, 0, 0);
        wait(at + 1.1, () => {
          at = glide(3, 6, 0);
          wait(at + 0.5, () => {
            place();
            wait(0.9, () => {
              select('table', 0);
              ghost.x = 3;
              ghost.y = 3;
              renderGhost();
              at = glide(4, 4, 0.2);
              wait(at + 0.5, () => {
                place();
                wait(0.9, () => {
                  select('armchair', 1);
                  at = glide(7, 4, 0.2);
                  wait(at + 0.5, () => {
                    place();
                    wait(1.4, () => {
                      undo();
                      wait(1, () => {
                        redo();
                        wait(1.6, () => {
                          clearRoom(true);
                          wait(2.2, () => {
                            undo();
                            autoplay = false;
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  }
  if (!reduce) {
    let started = false;
    whenVisible(
      svg,
      (v) => {
        if (v && !started && autoplay) {
          started = true;
          runDemo();
        }
      },
      '-20% 0px',
    );
  }
}
