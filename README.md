# ZoomCity — website

An animated website for **ZoomCity**, a city builder in development for PC (Steam) and mobile: build a city with real-life rules, then zoom from the whole city into any building, floor and room and decorate every corner.

**Stack:** Vite · Three.js · GSAP 3 (ScrollTrigger, SplitText, DrawSVG, ScrambleText) · Lenis

## What's on the page

| Section | What it does |
| --- | --- |
| Contract intro | You "sign" the residency contract: terms appear, the signature writes itself, the approval stamp slams down |
| The zoom | A procedural 3D city (traffic, trees, street lamps, clouds). Scrolling drives the camera City → Building → Floor → Room: the upper floors lift away, then the camera steps inside and a lamp flickers on. Breadcrumb, zoom rail, minimap pin, "City view" jump, double-click to go one level deeper, and hover-to-inspect buildings at City level |
| Construction | Scroll-scrubbed build: foundation → amber skeleton (crane working) → walls & roof → finished, paying each stage from the $50,000 balance |
| Land | Greenfield / Coastal / Desert / Arctic with terrain accents, live weather particles and cost modifiers |
| Real-life logic | Pinned horizontal row of cards flipping from each game rule to its real-world parallel |
| Decorate | A playable floor plan: pick furniture, green/red placement (door swing, window, collisions), rotate, undo/redo, clear to storage vs. clear and delete, decor spend tracker |
| Systems | Live mini-sims: utility coverage, resident approval, quality tiers, warehouse auto-arrange, recycling tiers, rush build |
| Passport | Type a name to generate a citizen ID, signature (cursive / sign here / stamp) and machine-readable line; tilt and flip the card |
| Roadmap | Design status: chapters 1–6 locked, what's in design now, what comes next |

Day/night toggle re-lights the whole 3D city (windows and street lamps glow at night). `prefers-reduced-motion` is respected: no intro, smooth scroll or pinning, and every section shows a still, readable state.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
npm run preview
```

## Deploy

`.github/workflows/deploy.yml` publishes `dist/` to GitHub Pages on every push to `main`.
