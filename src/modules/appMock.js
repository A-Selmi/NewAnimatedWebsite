import { gsap } from 'gsap';
import { formatETA, formatMB, whenVisible } from '../lib/env.js';

/**
 * Live download simulation inside the hero app window: progress bars, jittering
 * speeds, ETAs, completion flashes and a scrolling throughput graph.
 */
export function initAppMock({ reduce }) {
  const app = document.querySelector('[data-app]');
  if (!app) return;
  const totalEl = app.querySelector('[data-total-speed]');
  const badgeEl = document.querySelector('[data-badge-speed]');
  const areaEl = app.querySelector('[data-graph-area]');
  const lineEl = app.querySelector('[data-graph-line]');

  const tasks = [...app.querySelectorAll('.task')].map((li) => ({
    li,
    bar: li.querySelector('.task-bar span'),
    done: li.querySelector('[data-done]'),
    speedEl: li.querySelector('[data-speed]'),
    etaEl: li.querySelector('[data-eta]'),
    stateEl: li.querySelector('.task-state'),
    size: parseFloat(li.dataset.size),
    base: parseFloat(li.dataset.speed),
    p: parseFloat(li.dataset.p) || 0,
    speed: parseFloat(li.dataset.speed),
    finishedAt: 0,
  }));

  const history = Array.from({ length: 60 }, (_, i) => 80 + Math.sin(i / 4) * 20);
  let clock = 0;
  let graphClock = 0;

  const paint = () => {
    let total = 0;
    tasks.forEach((t) => {
      const finished = t.finishedAt > 0;
      gsap.set(t.bar, { scaleX: t.p });
      t.done.textContent = formatMB(t.p * t.size);
      t.speedEl.textContent = finished ? '0.0' : t.speed.toFixed(1);
      t.etaEl.textContent = finished ? 'done' : formatETA(((1 - t.p) * t.size) / t.speed);
      if (!finished) total += t.speed;
    });
    totalEl.textContent = total.toFixed(1);
    if (badgeEl) badgeEl.textContent = total.toFixed(1);
    return total;
  };

  const drawGraph = () => {
    const max = Math.max(...history, 1) * 1.15;
    const pts = history.map((v, i) => [(i / (history.length - 1)) * 300, 60 - (v / max) * 56]);
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const cx = (x0 + x1) / 2;
      d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
    }
    lineEl.setAttribute('d', d);
    areaEl.setAttribute('d', `${d} L300,60 L0,60 Z`);
  };

  paint();
  drawGraph();
  if (reduce) return;

  let running = false;
  whenVisible(app, (v) => (running = v));

  gsap.ticker.add((time, delta) => {
    if (!running) return;
    const dt = Math.min(delta, 100) / 1000;
    clock += dt;
    graphClock += dt;
    if (clock < 0.12) return;
    const step = clock;
    clock = 0;

    tasks.forEach((t) => {
      if (t.finishedAt) {
        if (time - t.finishedAt > 1.8) {
          t.finishedAt = 0;
          t.p = 0;
          t.li.classList.remove('is-done');
          t.stateEl.textContent = 'Downloading';
        }
        return;
      }
      const target = t.base * (0.65 + Math.random() * 0.7);
      t.speed += (target - t.speed) * 0.35;
      // Sizes are scaled down so the demo cycles within seconds rather than minutes.
      t.p = Math.min(1, t.p + (t.speed * step * 6) / t.size);
      if (t.p >= 1) {
        t.finishedAt = time;
        t.li.classList.add('is-done');
        t.stateEl.textContent = 'Completed';
        gsap.fromTo(t.li, { scale: 1 }, { scale: 1.02, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' });
      }
    });
    const total = paint();
    if (graphClock > 0.35) {
      graphClock = 0;
      history.push(total);
      history.shift();
      drawGraph();
    }
  });
}
