# Motrix — animated remake

An over-the-top animated landing page for [Motrix](https://github.com/agalwood/Motrix), the free, open-source download manager.
Unofficial fan project: original design, copy and logo; not affiliated with the Motrix project.

**Stack:** Vite · GSAP 3 (ScrollTrigger, SplitText, ScrambleText, MotionPath, DrawSVG, Text) · Three.js · Lenis

## What moves

| Section | Animation |
| --- | --- |
| Preloader | The page "downloads itself": 16 segments fill in parallel, live MB/s + thread counter, curtain split |
| Hero | WebGL warp tunnel (~3k particles with streak tails that stretch with scroll velocity, mouse parallax, warp burst on load), split-char 3D headline, scrambling word rotator, magnetic CTAs |
| App window | Live download simulation: progress bars, jittering speeds, ETAs, completion flashes, rolling throughput graph; tilts with the pointer and flattens on scroll |
| Marquee | Infinite rows whose speed follows scroll velocity, flip direction with scroll direction, and skew |
| 64 threads | Pinned, scroll-scrubbed 8×8 segment grid vs. a crawling single-thread bar, live HUD |
| Features bento | 3D tilt + cursor spotlight cards, each with its own live demo (torrent file picker, tracker ticker, speed gauge with limiter, UPnP packets, User-Agent scramble, notification stack, split-flap greetings incl. Arabic, tray meter, 10 parallel lanes) |
| How it works | Pinned horizontal scroll; typed links, slider, warp lines, self-drawing check + confetti |
| Browser hand-off | Cursor clicks a download, the file flies along a motion path into the app and completes |
| Stats / Download | Counters, OS detection with rotating conic border, typed install commands with copy |
| Footer | Wordmark that reveals in 3D and reacts to the cursor with variable-font weight |
| Global | Lenis smooth scroll, blend-mode cursor, grain, aurora, page "download" progress bar, circular view-transition theme switch |

`prefers-reduced-motion` is respected: no preloader, smooth scroll or loops; every section renders its final state.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
npm run preview
```

## Deploy

`.github/workflows/deploy.yml` builds and publishes `dist/` to GitHub Pages on every push to `main`.
Enable it once under **Settings → Pages → Source: GitHub Actions**.
