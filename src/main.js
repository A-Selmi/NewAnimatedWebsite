import './styles/base.css';
import './styles/sections.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

import { finePointer, reduceMotion } from './lib/env.js';
import { bindAnchors, initSmoothScroll, scrollState } from './lib/smooth.js';
import { runPreloader } from './modules/preloader.js';
import { initCursor, initMagnetic } from './modules/cursor.js';
import { diveIn, initZoom } from './modules/zoom.js';
import { initMarquee } from './modules/marquee.js';
import { initBuild } from './modules/build.js';
import { initLand } from './modules/land.js';
import { initLogic } from './modules/logic.js';
import { initDecorate } from './modules/decorate.js';
import { initSystems } from './modules/systems.js';
import { initPassport } from './modules/passport.js';
import { heroIntro, initNav, initReveals, initRoadmap, initShare, initTheme, initWordmark } from './modules/ui.js';

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, ScrambleTextPlugin);

const ctx = { reduce: reduceMotion };

const fontsReady = () =>
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 2500))]);

async function boot() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const lenis = ctx.reduce ? null : initSmoothScroll();
  lenis?.stop();
  bindAnchors();
  if (!ctx.reduce) {
    if (finePointer) initCursor();
    initMagnetic();
  }

  // Three.js is split into its own chunk and loads while the contract signs itself.
  const canvas = document.querySelector('.city-canvas');
  const cityPromise = import('./modules/city/scene.js')
    .then(({ createCity }) => createCity(canvas))
    .catch(() => {
      canvas.remove();
      return null;
    });

  let city = null;
  initTheme({
    reduce: ctx.reduce,
    onChange: (next) => {
      if (!city) return;
      gsap.to(city.themeState, {
        t: next === 'night' ? 1 : 0,
        duration: ctx.reduce ? 0 : 1.4,
        ease: 'power2.inOut',
        onUpdate: () => {
          city.applyTheme();
          if (ctx.reduce) city.render();
        },
      });
    },
  });

  await fontsReady();
  city = await cityPromise;

  // Pinned sections are created top to bottom so ScrollTrigger spacing stays correct.
  initZoom({ reduce: ctx.reduce, city });
  initMarquee(scrollState, ctx);
  initBuild(ctx);
  initLand(ctx);
  initLogic(ctx);
  initDecorate(ctx);
  initSystems(ctx);
  initPassport(ctx);
  initRoadmap(ctx);
  initShare();
  initNav();
  initWordmark(ctx);
  initReveals(ctx);

  const intro = ctx.reduce ? null : heroIntro();
  ScrollTrigger.refresh();
  await runPreloader(ctx);

  if (!ctx.reduce) {
    diveIn(city);
    intro.play();
    lenis?.start();
  }
}

boot();
