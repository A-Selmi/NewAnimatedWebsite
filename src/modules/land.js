import { gsap } from 'gsap';
import { rand, whenVisible } from '../lib/env.js';

const LANDS = {
  green: {
    name: 'Greenfield',
    weather: 'Weather: spring showers',
    desc: 'Easy, fertile land. The baseline everything else is measured against.',
    mod: 'Normal',
    price: 12000,
    fx: 'rain',
  },
  coast: {
    name: 'Coastal',
    weather: 'Weather: sea breeze & rain',
    desc: 'Grass inland, sand by the water. Beachfront living with ocean access, and a little beach furniture.',
    mod: 'Mixed',
    price: 12000,
    fx: 'wind',
  },
  desert: {
    name: 'Desert',
    weather: 'Weather: sandstorms',
    desc: 'Sandy ground needs reinforced foundations, so everything costs a bit more to build.',
    mod: '+15%',
    price: 13800,
    fx: 'sand',
  },
  arctic: {
    name: 'Arctic',
    weather: 'Weather: snowstorms',
    desc: 'Permafrost is hard to dig into. Expect snow on the roof and frost on the windows.',
    mod: '+25%',
    price: 15000,
    fx: 'snow',
  },
};

/** Land picker: swaps the diorama's terrain accents and runs matching weather particles. */
export function initLand({ reduce }) {
  const tabs = [...document.querySelectorAll('[data-land]')];
  const diorama = document.querySelector('[data-diorama]');
  if (!tabs.length || !diorama) return;
  const nameEl = document.querySelector('[data-land-name]');
  const descEl = document.querySelector('[data-land-desc]');
  const weatherEl = document.querySelector('[data-land-weather]');
  const modEl = document.querySelector('[data-land-mod]');
  const priceEl = document.querySelector('[data-land-price]');
  const canvas = diorama.querySelector('[data-weather]');
  const ctx = canvas.getContext('2d');
  const price = { v: 12000 };
  let current = 'green';
  let userPicked = false;

  const select = (key, fromUser) => {
    if (fromUser) userPicked = true;
    if (key === current && !fromUser) return;
    current = key;
    const land = LANDS[key];
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.land === key)));
    diorama.dataset.terrain = key;
    const swap = [nameEl, descEl, weatherEl];
    if (reduce) {
      nameEl.textContent = land.name;
      descEl.textContent = land.desc;
      weatherEl.textContent = land.weather;
    } else {
      gsap.timeline()
        .to(swap, { y: -10, opacity: 0, duration: 0.2, stagger: 0.03 })
        .add(() => {
          nameEl.textContent = land.name;
          descEl.textContent = land.desc;
          weatherEl.textContent = land.weather;
        })
        .to(swap, { y: 0, opacity: 1, duration: 0.35, stagger: 0.05, ease: 'back.out(2)' });
      gsap.fromTo(diorama.querySelector('.d-house'), { y: -14 }, { y: 0, duration: 0.7, ease: 'bounce.out' });
    }
    modEl.textContent = land.mod;
    gsap.to(price, { v: land.price, duration: reduce ? 0 : 0.8, ease: 'power2.out', onUpdate: () => (priceEl.textContent = Math.round(price.v).toLocaleString('en-US')) });
    seedParticles(land.fx);
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t.dataset.land, true));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus();
      select(next.dataset.land, true);
    });
  });

  // weather particles
  let W = 0;
  let H = 0;
  let particles = [];
  let fx = 'rain';
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width;
    H = r.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const make = () => {
    if (fx === 'snow') return { x: rand(0, W), y: rand(-H, H), r: rand(1.2, 3.4), vy: rand(0.5, 1.5), sway: rand(0, 6.28) };
    if (fx === 'sand') return { x: rand(-W, W), y: rand(0, H), len: rand(20, 60), vx: rand(6, 12), a: rand(0.2, 0.6) };
    return { x: rand(0, W * 1.2), y: rand(-H, H), len: rand(10, 18), vy: rand(7, 11), vx: fx === 'wind' ? -3.2 : -1.2 };
  };
  function seedParticles(kind) {
    fx = kind;
    const count = kind === 'sand' ? 70 : kind === 'snow' ? 110 : 90;
    particles = Array.from({ length: count }, make);
  }
  seedParticles('rain');
  resize();
  window.addEventListener('resize', resize);

  if (reduce) return;
  let visible = false;
  whenVisible(diorama, (v) => (visible = v));
  gsap.ticker.add((time, delta) => {
    if (!visible) return;
    const k = Math.min(delta, 50) / 16.7;
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round';
    if (fx === 'snow') ctx.fillStyle = 'rgba(255,255,255,0.95)';
    else if (fx === 'sand') ctx.strokeStyle = 'rgba(214,160,90,0.7)';
    else ctx.strokeStyle = 'rgba(80,140,210,0.55)';
    ctx.lineWidth = fx === 'sand' ? 2 : 1.6;
    particles.forEach((p) => {
      if (fx === 'snow') {
        p.y += p.vy * k;
        p.x += Math.sin(time * 1.5 + p.sway) * 0.6 * k;
        if (p.y > H) Object.assign(p, make(), { y: -5 });
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (fx === 'sand') {
        p.x += p.vx * k;
        p.y += Math.sin(time * 2 + p.x * 0.01) * 0.4 * k;
        if (p.x > W + 60) Object.assign(p, make(), { x: -60 });
        ctx.globalAlpha = p.a;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.len, p.y + 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        p.y += p.vy * k;
        p.x += p.vx * k;
        if (p.y > H) Object.assign(p, make(), { y: -20 });
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 1.6, p.y + p.len);
        ctx.stroke();
      }
    });
  });

  // Tour the four lands until someone picks one
  const order = ['green', 'coast', 'desert', 'arctic'];
  let i = 0;
  const tour = () => {
    if (userPicked) return;
    if (visible) {
      i = (i + 1) % order.length;
      select(order[i]);
    }
    gsap.delayedCall(4.2, tour);
  };
  gsap.delayedCall(4.2, tour);
}
