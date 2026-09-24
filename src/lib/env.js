export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
export const isDesktop = () => window.matchMedia('(min-width: 901px)').matches;

export function detectOS() {
  const ua = navigator.userAgent || '';
  const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return 'mobile';
  if (/Win/i.test(platform) || /Windows/i.test(ua)) return 'windows';
  if (/Mac/i.test(platform) || /Mac OS X/i.test(ua)) {
    // iPadOS reports itself as a Mac but has touch.
    return navigator.maxTouchPoints > 1 ? 'mobile' : 'mac';
  }
  if (/Linux|X11|CrOS/i.test(platform + ua)) return 'linux';
  return 'unknown';
}

export const rand = (min, max) => min + Math.random() * (max - min);
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export function formatMB(mb) {
  if (mb >= 1000) return `${(mb / 1000).toFixed(2)} GB`;
  if (mb >= 1) return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
  return `${Math.round(mb * 1000)} KB`;
}

export function formatETA(seconds) {
  if (!isFinite(seconds) || seconds <= 0) return '--';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

/** Run `onChange(true|false)` as an element scrolls in and out of view. */
export function whenVisible(el, onChange, rootMargin = '80px') {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((entry) => onChange(entry.isIntersecting)),
    { rootMargin },
  );
  io.observe(el);
  return io;
}
