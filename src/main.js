import './styles/base.css';
import './styles/sections.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { TextPlugin } from 'gsap/TextPlugin';

import { finePointer, reduceMotion } from './lib/env.js';
import { bindAnchors, initSmoothScroll, scrollState } from './lib/smooth.js';
import { runPreloader } from './modules/preloader.js';
import { initCursor, initMagnetic } from './modules/cursor.js';
import { heroIntro, initHeroScroll, initRotator } from './modules/hero.js';
import { initAppMock } from './modules/appMock.js';
import { initMarquee } from './modules/marquee.js';
import { initThreads } from './modules/threads.js';
import { initCardFX, initDemos } from './modules/features.js';
import { initFlow } from './modules/flow.js';
import { initHandoff } from './modules/handoff.js';
import { initDownload, initNav, initReveals, initStats, initTheme, initWordmark } from './modules/ui.js';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, MotionPathPlugin, DrawSVGPlugin, TextPlugin);

const ctx = { reduce: reduceMotion };

const fontsReady = () =>
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 2500))]);

async function boot() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  initTheme(ctx);
  initDownload(ctx);

  const lenis = ctx.reduce ? null : initSmoothScroll();
  lenis?.stop();
  bindAnchors();

  if (!ctx.reduce) {
    if (finePointer) initCursor();
    initMagnetic();
  }

  const scenePromise = import('./modules/heroScene.js')
    .then(({ initHeroScene }) => initHeroScene(document.querySelector('.hero-canvas'), { reduce: ctx.reduce, scrollState }))
    .catch(() => ({ boost() {} }));

  await fontsReady();

  initAppMock(ctx);
  initMarquee(scrollState, ctx);
  initThreads(ctx);
  initCardFX(ctx);
  initDemos(ctx);
  initFlow(ctx);
  initHandoff(ctx);
  initStats(ctx);
  initNav();
  initWordmark(ctx);
  initReveals(ctx);

  let intro = null;
  if (!ctx.reduce) {
    initHeroScroll();
    intro = heroIntro().pause();
  }

  ScrollTrigger.refresh();
  const [scene] = await Promise.all([scenePromise, runPreloader(ctx)]);

  if (!ctx.reduce) {
    scene.boost();
    intro.play();
    lenis?.start();
    initRotator();
  }
}

boot();
