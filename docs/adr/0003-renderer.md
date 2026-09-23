# 0003. Components emit an SVG display list, rasterised by Skia

- Status: Proposed (revised after spike 002)
- Date: 2026-09-23

## Context

Goals (`docs/goals.md`): local first, final render at <= 0.25 s per video second, preview updates under 100 ms.
Measured baseline: Manim renders at 1.9 s per video second at 1080p30 on one core.

The original proposal was Remotion: React components rendered in headless Chromium, one screenshot per frame.
Two problems against the goals:

1. **Speed risk.** A browser screenshot per frame adds page compositing, image encoding and inter-process transfer to
   every frame. Unmeasured here, but it is the most likely bottleneck.
2. **Licence.** Remotion (read from the `remotion` 4.0.527 package) is free for individuals, companies of up to 3
   people, non-profits and evaluation; larger companies need a paid licence, and reselling a derivative is not
   allowed. This conflicts with an open source Lucent.

## Options

| Option | For | Against |
|---|---|---|
| Remotion 4 (headless Chromium) | Full HTML and CSS, Studio preview, very active | Per-frame browser overhead; licence |
| Own headless Chromium (Playwright 1.63, Apache-2.0) | Permissive, full HTML and CSS | Same per-frame overhead |
| **SVG display list rasterised by resvg** (`@resvg/resvg-js` 2.6, MPL-2.0; `resvg` crate 0.48) | No browser, native Rust speed, deterministic, parallel across worker threads | Only SVG features resvg supports; photos must not be re-decoded every frame |
| **SVG display list drawn on Skia** (`@napi-rs/canvas` 1.0, MIT) | Native Skia speed, decoded images stay in memory across frames | We translate our SVG subset to Canvas calls ourselves |
| Native Rust renderer (vello, tiny-skia) | Fastest possible | Rejected with ADR 0001: months of work |

## Decision

Components return a restricted **SVG subset**: `g`, `rect`, `circle`, `ellipse`, `line`, `path`, `text`, `image`,
with transforms, opacity, fills, strokes and clip paths. No HTML, no CSS layout (layout is the engine's job, ADR
0009). Filters (blur, shadow) join the subset only after their cost is measured.

- **Preview**: the browser renders the SVG directly (Vite dev server with a scrubber). No screenshots.
- **Final render**: **Skia via `@napi-rs/canvas`** (MIT) in a pool of worker threads, drawing the subset as Canvas
  calls with decoded photos kept in memory across frames, `imageSmoothingQuality: "medium"`, and raw RGBA piped to
  ffmpeg. Never PNG files per frame.

Measured in spike 002 on the M5 Pro with 15 workers: 0.64 ms per 1080p frame for both the photo-drift and the helix
scene, and 0.09 to 0.16 s per video second end to end including encoding, against a budget of 0.25 s. resvg was
rejected because it re-decodes embedded photos on every frame (12.3 ms per frame with 15 workers). Headless Chromium
was rejected because screenshots alone cost 7.7 ms per frame and pass through lossy JPEG.

Remotion is not used.

## Consequences

- No per-frame browser, no licence constraint, a render path that is native code from SVG to pixels. The encoder,
  not drawing, is now the bottleneck (spike 006).
- Fonts must be single-face files registered by path: with the macOS `Avenir Next.ttc` collection, Skia selects only
  the bold face (spike 002). This matches the bundled-font rule in `docs/goals.md`.
- Preview and final render draw the same SVG, so what you see is what you get, within rasteriser differences that
  golden tests measure.
- Components cannot use CSS effects (backdrop blur, CSS filters). Anything needed is added to the subset only if
  every backend supports it.
- We own a small amount of preview UI (timeline scrubber, scene markers) that Remotion Studio would have provided.

Revisit if: busier real scenes, filters or Linux (all unmeasured) break the budget, or the subset blocks a visual the
owner needs.
