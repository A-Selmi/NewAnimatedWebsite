import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { rand } from '../lib/env.js';

/**
 * Horizontal, pinned "how it works" track. Each panel owns a small looping timeline
 * that restarts whenever the panel slides into view.
 */
export function initFlow({ reduce }) {
  const panels = [...document.querySelectorAll('[data-flow]')];
  if (!panels.length) return;
  const builders = { paste, tune, fly, done };
  const anims = new Map(panels.map((p) => [p, builders[p.dataset.flow](p, { reduce })]));
  if (reduce) return;

  const bindPanel = (panel, extra = {}) => {
    const anim = anims.get(panel);
    ScrollTrigger.create({
      trigger: panel,
      ...extra,
      onToggle: (self) => (self.isActive ? anim.restart() : anim.pause()),
    });
  };

  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const track = document.querySelector('.flow-track');
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const slide = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.flow-pin',
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
      },
    });
    gsap.to('[data-flow-progress]', {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { trigger: '.flow-pin', start: 'top top', end: () => `+=${distance()}`, scrub: true, invalidateOnRefresh: true },
    });

    panels.forEach((panel, i) => {
      gsap.fromTo(
        panel.querySelector('.flow-num'),
        { xPercent: 30 },
        { xPercent: -30, ease: 'none', scrollTrigger: { trigger: panel, containerAnimation: slide, start: 'left right', end: 'right left', scrub: true } },
      );
      if (i > 0) {
        gsap.fromTo(
          panel,
          { rotateY: -28, scale: 0.88, opacity: 0.35, transformPerspective: 1400, transformOrigin: '0% 50%' },
          { rotateY: 0, scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: panel, containerAnimation: slide, start: 'left right', end: 'left 60%', scrub: true } },
        );
      }
      bindPanel(panel, { containerAnimation: slide, start: 'left 80%', end: 'right 10%' });
    });
  });
  mm.add('(max-width: 900px)', () => {
    panels.forEach((panel) => bindPanel(panel, { start: 'top 80%', end: 'bottom 15%' }));
  });
}

/* 01: links type themselves into the input and get classified. */
function paste(panel, { reduce }) {
  const typed = panel.querySelector('[data-fv-typed]');
  const kind = panel.querySelector('[data-fv-kind]');
  const go = panel.querySelector('.fv-go');
  const links = [
    ['magnet:?xt=urn:btih:9f2c4e…e81a&dn=open-movie', 'Magnet'],
    ['https://mirror.example.org/distro-24.04.iso', 'HTTPS'],
    ['ftp://files.example.net/pub/archive.tar.gz', 'FTP'],
    ['~/Downloads/lecture-series.torrent', 'Torrent'],
  ];
  if (reduce) {
    typed.textContent = links[0][0];
    return null;
  }
  const tl = gsap.timeline({ repeat: -1, paused: true });
  links.forEach(([text, label]) => {
    tl.set(typed, { text: '' })
      .call(() => (kind.textContent = '…'))
      .to(typed, { text: { value: text }, duration: text.length * 0.032, ease: 'none' })
      .call(() => (kind.textContent = label))
      .fromTo(kind, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(3)', immediateRender: false })
      .to(go, { scale: 0.9, duration: 0.12, yoyo: true, repeat: 1 }, '+=0.35')
      .to(typed, { text: { value: '' }, duration: 0.35, ease: 'none' }, '+=0.9');
  });
  return tl;
}

/* 02: the split slider slides from 1 to 64. */
function tune(panel, { reduce }) {
  const fill = panel.querySelector('[data-fv-fill]');
  const knob = panel.querySelector('[data-fv-knob]');
  const num = panel.querySelector('[data-fv-split]');
  const s = { v: 0 };
  const render = () => {
    gsap.set(fill, { scaleX: s.v });
    gsap.set(knob, { left: `${s.v * 100}%` });
    num.textContent = Math.max(1, Math.round(1 + s.v * 63));
  };
  if (reduce) {
    s.v = 1;
    render();
    return null;
  }
  render();
  const go = (v, duration, ease = 'power3.inOut') => ({ v, duration, ease, onUpdate: render });
  return gsap
    .timeline({ repeat: -1, repeatDelay: 0.4, paused: true })
    .to(s, go(1, 1.6))
    .to(knob, { scale: 1.35, duration: 0.2, yoyo: true, repeat: 1 })
    .to(s, go(0.3, 0.8), '+=1.2')
    .to(s, go(1, 0.9))
    .to(s, go(0, 0.9), '+=1.4');
}

/* 03: warp lines + a hot speed counter. */
function fly(panel, { reduce }) {
  const box = panel.querySelector('[data-fv-lines]');
  const speed = panel.querySelector('[data-fv-speed]');
  const lines = Array.from({ length: 22 }, () => {
    const i = document.createElement('i');
    i.style.top = `${rand(4, 96)}%`;
    i.style.width = `${rand(18, 46)}%`;
    i.style.opacity = rand(0.35, 1).toFixed(2);
    box.appendChild(i);
    return i;
  });
  if (reduce) {
    speed.textContent = '128.4';
    return null;
  }
  const counter = { v: 0 };
  const tl = gsap.timeline({ paused: true });
  lines.forEach((line) => {
    tl.fromTo(
      line,
      { xPercent: -110 },
      { xPercent: () => (box.offsetWidth / line.offsetWidth) * 100 + 10, duration: rand(0.35, 0.9), ease: 'none', repeat: -1, delay: rand(0, 0.8) },
      0,
    );
  });
  tl.fromTo(counter, { v: 0 }, { v: 128.4, duration: 1.6, ease: 'expo.out', onUpdate: () => (speed.textContent = counter.v.toFixed(1)) }, 0);
  tl.to({}, { duration: 0.3, repeat: -1, onRepeat: () => (speed.textContent = rand(116, 142).toFixed(1)) }, 1.6);
  return tl;
}

/* 04: check ring draws itself, tick lands, confetti pops. */
function done(panel, { reduce }) {
  const ring = panel.querySelector('[data-fv-ring]');
  const tick = panel.querySelector('[data-fv-tick]');
  const burst = panel.querySelector('[data-fv-burst]');
  const colors = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--ok)'];
  const dots = Array.from({ length: 20 }, (_, i) => {
    const d = document.createElement('i');
    d.style.background = colors[i % colors.length];
    burst.appendChild(d);
    return d;
  });
  gsap.set(ring, { rotation: -90, svgOrigin: '60 60' });
  if (reduce) return null;
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.3, paused: true });
  tl.set(dots, { x: 0, y: 0, scale: 1, opacity: 0 })
    .fromTo(ring, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.9, ease: 'power2.inOut' })
    .fromTo(tick, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.45, ease: 'power3.out' }, '-=0.15')
    .fromTo('.fv-check', { scale: 0.9 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.4)' }, '<')
    .to(
      dots,
      {
        opacity: 1,
        duration: 0.9,
        ease: 'expo.out',
        x: (i) => Math.cos((i / dots.length) * Math.PI * 2) * rand(70, 120),
        y: (i) => Math.sin((i / dots.length) * Math.PI * 2) * rand(55, 90),
        scale: () => rand(0.5, 1.4),
      },
      '<',
    )
    .to(dots, { opacity: 0, scale: 0, duration: 0.5, stagger: 0.01 }, '-=0.3')
    .to([ring, tick], { opacity: 0, duration: 0.4 }, '+=0.8')
    .set([ring, tick], { opacity: 1, drawSVG: '0%' });
  return tl;
}
