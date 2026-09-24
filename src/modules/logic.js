import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** Pinned horizontal row of cards that flip from game rule to real-life parallel as they pass. */
export function initLogic({ reduce }) {
  const cards = [...document.querySelectorAll('.flip')];
  if (!cards.length) return;
  cards.forEach((c) => {
    // the back repeats the rule it explains, so a flipped card still makes sense alone
    const rule = c.querySelector('.flip-front h3').textContent;
    const was = document.createElement('p');
    was.className = 'flip-was';
    was.textContent = `ZoomCity: ${rule}`;
    c.querySelector('.flip-back small').after(was);
    c.addEventListener('click', () => c.classList.toggle('is-flipped'));
  });
  if (reduce) return;

  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const track = document.querySelector('.logic-track');
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const slide = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: { trigger: '.logic-pin', start: 'top top', end: () => `+=${distance() + 200}`, pin: true, scrub: 0.8, invalidateOnRefresh: true },
    });
    gsap.to('[data-logic-progress]', {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { trigger: '.logic-pin', start: 'top top', end: () => `+=${distance() + 200}`, scrub: true, invalidateOnRefresh: true },
    });
    cards.forEach((card, i) => {
      gsap.fromTo(
        card,
        { y: i % 2 ? 40 : -20, rotation: i % 2 ? 3 : -3 },
        { y: i % 2 ? -20 : 30, rotation: i % 2 ? -2 : 2, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: slide, start: 'left right', end: 'right left', scrub: true } },
      );
      ScrollTrigger.create({
        trigger: card,
        containerAnimation: slide,
        start: 'center 62%',
        onEnter: () => card.classList.add('is-flipped'),
        onLeaveBack: () => card.classList.remove('is-flipped'),
      });
    });
  });
  mm.add('(max-width: 900px)', () => {
    cards.forEach((card) =>
      ScrollTrigger.create({
        trigger: card,
        start: 'top 60%',
        onEnter: () => card.classList.add('is-flipped'),
        onLeaveBack: () => card.classList.remove('is-flipped'),
      }),
    );
  });
}
