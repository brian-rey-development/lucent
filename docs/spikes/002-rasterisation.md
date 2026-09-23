# Spike 002: Rasterisation backend

|          |                                                                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Status   | Complete                                                                                                                               |
| Date     | 2026-09-23                                                                                                                             |
| Question | Which backend turns our SVG display list into 1080p frames fastest, with quality matching the browser preview, within `docs/goals.md`? |
| Informs  | ADR 0003 (renderer), ADR 0007 (scene segment cache)                                                                                    |
| Machine  | MacBook, Apple M5 Pro, 15 CPU cores (5 performance, 10 efficiency), 24 GB, macOS 26.4.1, Node 24.21.0, ffmpeg 8.1.2                    |

## 1. Question and why it matters

`docs/goals.md` sets the final render budget at **0.25 s per video second** at 1080p30, which is **7.5 ms of wall-clock
time per frame** using the whole machine, and memory under 4 GB. The Manim prototype runs at 1.9 s per video second
(63 ms per frame, measured earlier on this machine).

ADR 0003 (Proposed) says components emit an SVG subset (`g`, `rect`, `circle`, `ellipse`, `line`, `path`, `text`,
`image`, transforms, opacity, clip paths), the browser draws it in preview, and a native rasteriser draws it in the
final render. This spike measures which rasteriser, and whether the whole path (draw, get pixels, encode) fits the
budget.

## 2. Method

**Candidates**

| Backend  | Version                                        | How it draws our display list                                             |
| -------- | ---------------------------------------------- | ------------------------------------------------------------------------- |
| resvg    | `@resvg/resvg-js` 2.6.2 (resvg, Rust)          | Display list serialised to an SVG string, parsed and rendered per frame   |
| Skia     | `@napi-rs/canvas` 1.0.9 (Skia, C++)            | Display list translated to Canvas 2D calls (about 15 lines of translator) |
| Chromium | Playwright 1.63.0, bundled Chromium build 1243 | SVG string set as `innerHTML` in one page per tab, then `page.screenshot` |

`skia-canvas` was not measured (last release 2025-09; `@napi-rs/canvas` covers the same engine and is more active).

**Frames.** One display-list generator, two scenes, each a function of the frame number so every frame differs:

- **photo**: the real blood smear photo drawn full-bleed with a slow push-in, 3 ring ellipses, a "no nucleus" chip,
  a white title, and a caption chip with two lines (Avenir Next).
- **helix**: two strand paths of 192 points each, 48 coloured rungs with depth opacity, a row of 24 Menlo letters,
  one label.

Photo variants: original JPEG (3264x2448, 993 KB), pre-scaled JPEG 2560x1920 (308 KB), pre-scaled PNG 2560x1920
(4.6 MB).

**Measurements.** Single-thread: median of 20 warm frames. Throughput: a `worker_threads` pool of 1, 5, 10 and 15
workers pulling frame numbers from a queue, 150 to 300 frames, each producing raw RGBA. End to end: 14 workers
rendering, main thread reordering frames and piping raw RGBA into ffmpeg, 600 frames (20 s of video). Parity: the
same frame rendered by each backend, compared with Chromium as reference (mean absolute channel difference, and
share of pixels off by more than 32 on any channel), plus visual inspection of cropped text and edges.

All experiments are throwaway code in the session scratchpad; nothing here is Lucent code.

## 3. Findings

**F1. Skia meets the budget with a wide margin; resvg does not on photo frames.** Measured, raw RGBA out, no encode:

| Backend and frame              | 1 worker                      | 5            | 10           | 15       |
| ------------------------------ | ----------------------------- | ------------ | ------------ | -------- |
| Skia photo, smoothing `high`   | 20.6 ms                       | 4.76         | 2.61         | 2.06     |
| Skia photo, smoothing `medium` | 5.5 ms (single-thread median) | not measured | not measured | **0.64** |
| Skia helix                     | 3.2 ms                        | 1.05         | 0.73         | **0.64** |
| resvg photo (2560 JPEG)        | 97.3 ms                       | 21.8         | 13.6         | **12.3** |
| resvg helix                    | 13.9 ms                       | 3.23         | 2.41         | 2.52     |

Budget: 7.5 ms per frame. Skia is 12x under it at 15 workers; resvg misses it by 64% on photo frames. A first
`medium` pool run silently used `high` smoothing because of a harness bug; after the fix only the 15-worker run was
repeated, so the 5 and 10 worker cells are not measured.

**F2. resvg re-decodes embedded photos on every frame.** Measured single-thread: the photo frame costs 77 ms with the
2560 JPEG, 134 ms with the original JPEG, 121 ms with the 2560 PNG, and 18 ms with the image removed. So about
60 to 115 ms per frame is image decoding (plus base64 decoding of the data URI). resvg-js offers no way to hand it an
already decoded image, so this cannot be cached across frames (inferred from the API; the crate's image resolver also
returns encoded data). Skia decodes once per worker: decoding the original JPEG every frame costs 34 ms against
20.7 ms with a cached image (measured).

**F3. Text in resvg is slow unless fonts are passed as files.** Measured: `loadSystemFonts: true` adds about 51 ms per
frame (128 ms against 77 ms), because the font database is rebuilt per render. Passing two font files costs 0.5 ms
(1.7 ms against 1.2 ms for an empty frame). Helix text accounts for about 5 ms of resvg's 9 ms.

**F4. Skia's `high` image smoothing costs 3.6x more with no visible benefit here.** Measured single-thread: 19.9 ms
(`high`, cubic resampling) against 5.5 ms (`medium` and `low`, mipmapped). The rendered photo differs from `high` by
0.01/255 on average (measured) at this downscale (0.6 to 0.8x). Use `medium` for downscaled photos. Upscales beyond
1x were not tested.

**F5. Never encode PNG per frame.** Measured: Skia PNG encode 307 ms per frame against 20.5 ms for raw pixels; Chromium
PNG screenshots 235 ms against 33 ms for JPEG. Getting raw RGBA out of Skia (`canvas.data()`) is included in all
Skia numbers above; it is under 1 ms.

**F6. Chromium is close to the budget only before encoding, and only with lossy JPEG frames.** Measured, screenshot
only: 33 ms per frame in one tab; 10.0, 8.5 and 7.7 ms wall per frame with 5, 10 and 15 tabs. The 15-tab figure
already uses the whole budget before ffmpeg decodes the JPEGs and encodes the video, and each frame passes through
a lossy JPEG (quality 80). This matches how Remotion renders (a screenshot per frame from headless Chrome, JPEG by
default, tabs as concurrency; from its documentation, not re-verified in this spike).

**F7. The full path fits: 0.09 to 0.16 s per video second.** Measured, 14 Skia workers plus one ffmpeg process,
600 frames:

| Scene | h264_videotoolbox (q 65)                | libx264 (medium, CRF 18) |
| ----- | --------------------------------------- | ------------------------ |
| photo | 3.70 ms/frame, 0.111 s per video second | 5.24 ms/frame, 0.157 s   |
| helix | 3.68 ms/frame, 0.110 s                  | 3.09 ms/frame, 0.093 s   |

The encoder is now the bottleneck, not the rasteriser. Encoders alone, measured on 180 raw photo frames: libx264
medium 4.8 ms, libx264 veryfast 1.8 ms, h264_videotoolbox 4.4 ms, hevc_videotoolbox 4.7 ms, reading and converting
only 0.6 ms. VideoToolbox runs on the hardware media engine, so it leaves the CPU cores to the rasterisers. Per-scene
segments (ADR 0007) allow one encoder per scene in parallel, which should raise throughput further (estimated, not
measured).

**F8. Memory fits.** Measured peak process RSS (workers are threads, so this is the whole renderer): Skia 2.4 to 2.5 GB
at 15 workers, 2.0 to 2.1 GB in the end-to-end run with 14 workers. Each worker holds its decoded photo (19.7 MB for
2560x1920 RGBA) and its canvas (8.3 MB). resvg reached 3.1 GB at 15 workers on the helix.

**F9. Parity with the browser preview is good for shapes and photos; fonts must be single-face files.** Measured
against Chromium:

| Frame | Skia                                      | resvg           |
| ----- | ----------------------------------------- | --------------- |
| photo | 1.17/255 mean, 0.71% of pixels off by >32 | 0.46/255, 0.17% |
| helix | 0.23/255, 0.23%                           | 0.16/255, 0.12% |

Visual inspection: rings, strokes, rounded chips, opacity and Menlo letters look identical in all three. Skia's
Avenir Next text renders **bold where the others render regular**: `@napi-rs/canvas` exposes only one face of the
macOS `Avenir Next.ttc` collection (registered as weight 700), with or without `registerFromPath`. With single-face
files (tested with Arial regular and bold registered under one family) Skia selects the right weight (377.9 px
against 404.2 px for the same string). resvg reads `.ttc` collections correctly. Most of Skia's photo diff is this
font issue.

**F10. Licences and activity.**

| Package           | Licence                          | Last release | Note                                                                                                                                 |
| ----------------- | -------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `@napi-rs/canvas` | MIT (bundles Skia, BSD-3-Clause) | 2026-09-09   | Very active                                                                                                                          |
| `@resvg/resvg-js` | MPL-2.0                          | 2026-01-28   | File-level copyleft: using it unmodified as a dependency places no obligation on Lucent's own code; modified MPL files must stay MPL |
| `resvg` crate     | Apache-2.0 or MIT                | 2026-08-02   |                                                                                                                                      |
| Playwright        | Apache-2.0                       | 2026-09-23   | Chromium itself is BSD-3-Clause                                                                                                      |

**F11. Feature gaps, not measured.** Both native backends support clip paths (Canvas `clip()`, SVG `clipPath`) and
drop shadows (Canvas `shadowBlur`, SVG `feDropShadow`), but their cost and parity were not measured. Blur and shadow
on CPU can be expensive per frame and should be benchmarked before entering the subset.

## 4. Options compared

|                          | Skia (`@napi-rs/canvas`)                       | resvg (`@resvg/resvg-js`)     | Chromium (Playwright)                                  |
| ------------------------ | ---------------------------------------------- | ----------------------------- | ------------------------------------------------------ |
| Photo frame, 15 workers  | **0.64 ms** (measured)                         | 12.3 ms (measured)            | 7.7 ms screenshot only (measured)                      |
| Vector frame, 15 workers | **0.64 ms**                                    | 2.52 ms                       | Not measured separately (33 ms per tab)                |
| Full path with encode    | **0.09 to 0.16 s per video second** (measured) | Not measured; fails on photos | Estimated above 0.25 s (encode not included in 7.7 ms) |
| Decoded image reuse      | Yes, per worker                                | No, decodes every frame       | Yes, browser cache                                     |
| Parity with preview      | Good; needs single-face fonts                  | Best                          | Is the preview                                         |
| Output                   | Raw RGBA                                       | Raw RGBA                      | JPEG or PNG only                                       |
| Integration cost         | Translate our subset to Canvas calls (small)   | None, takes SVG               | None, takes SVG                                        |
| Licence                  | MIT                                            | MPL-2.0                       | Apache-2.0                                             |

## 5. Recommendation

1. **Final render: Skia through `@napi-rs/canvas`.** Translate the display list to Canvas 2D calls in one module;
   the preview keeps drawing the same display list as SVG in the browser.
2. **Keep decoded images per worker**, pre-scaled to the largest size the scene needs, drawn with
   `imageSmoothingQuality: "medium"`.
3. **Pipe raw RGBA to ffmpeg.** Never write PNG or JPEG per frame.
4. **Encode with `h264_videotoolbox` on macOS, `libx264` elsewhere**, one encoder per scene segment.
5. **Ship fonts as single-face files** (for example OFL families), registered by file with explicit family and
   weight. Do not rely on system collections: they misrender in Skia, and fonts like Avenir Next are not
   redistributable, so videos would render differently off macOS.
6. **Reject resvg for the render path** (per-frame decoding) and **Chromium** (lossy frames, screenshot overhead).
   Neither is needed as a fallback for the current subset.

Suggested change to ADR 0003: replace "chosen by benchmark" with "Skia via `@napi-rs/canvas` (spike 002)", and add
that filters (blur, shadow) enter the subset only after a cost measurement. No change to `docs/goals.md` is needed:
the measured path uses 36 to 63% of the render budget and about half of the memory budget, which is the right
headroom for real scenes that are busier than these two.

## 6. Risks and unknowns

- **Synthetic scenes.** Real scenes stack more elements (census sheet, many labels, karyotype images). Per-frame cost
  grows with them; the 12x rasteriser headroom should absorb it, but it is not proven.
- **Colour.** ffmpeg's default RGB to YUV conversion and missing colour tags can shift colours between preview and
  video. The encode step must set BT.709 conversion and tags explicitly. Not checked in this spike.
- **Encoder quality.** VideoToolbox at q 65 and libx264 at CRF 18 produced similar file sizes, but visual quality was
  not compared (no VMAF or PSNR run).
- **Filters and clip paths.** Unmeasured (F11).
- **Other platforms.** Linux and CI performance, and libx264 on fewer cores, are unmeasured. VideoToolbox is
  macOS-only.
- **Main-thread copying.** The end-to-end harness copies every frame once from worker to main thread (8.3 MB). It
  fits today; if it becomes a bottleneck, workers can write segments directly with one encoder each.

## 7. Sources

- resvg: https://github.com/linebender/resvg
- resvg-js: https://github.com/thx/resvg-js
- @napi-rs/canvas: https://github.com/Brooooooklyn/canvas
- Skia: https://skia.org
- Playwright screenshots: https://playwright.dev/docs/screenshots
- Remotion rendering and concurrency: https://www.remotion.dev/docs/render
- Motion Canvas rendering: https://motioncanvas.io/docs/rendering
- Revideo: https://docs.re.video
- FFmpeg VideoToolbox encoders: https://trac.ffmpeg.org/wiki/HWAccelIntro
- MPL-2.0 FAQ: https://www.mozilla.org/en-US/MPL/2.0/FAQ/

The Remotion, Motion Canvas and Revideo descriptions come from their documentation and prior knowledge; they were not
re-verified in this spike.

## Appendix: experiment details

Setup: `pnpm add @resvg/resvg-js@2.6.2 @napi-rs/canvas@1.0.9 playwright@1.63.0 sharp` in a scratch folder; photos
pre-scaled with sharp; fonts `/System/Library/Fonts/Avenir Next.ttc` and `Menlo.ttc`.

Single-thread medians, 20 frames (measured, ms):

```
resvg photo orig (data URI)          134.3     skia photo orig (decoded once)      20.7
resvg photo jpg2560 (data URI)        77.1     skia photo jpg2560 (decoded once)   20.5
resvg photo png2560 (data URI)       120.5     skia photo png2560 (decoded once)   20.7
resvg photo jpg2560 + asPng          110.2     skia photo jpg2560 + png encode    306.6
resvg photo loadSystemFonts:true     128.0     skia photo orig, decode per frame   34.0
resvg helix                            9.1     skia helix                           2.8
resvg photo frame, image removed      18.3     skia helix via Skia SVG module      49.4
resvg empty frame, no fonts            1.2     skia smoothing high / medium / low  19.9 / 5.5 / 5.5
resvg empty frame, 2 font files        1.7     SVG string build (photo)             0.1
resvg helix without text               3.9
```

Chromium (measured, ms per frame): photo JPEG 33.3, photo PNG 234.9, helix JPEG 33.4, helix PNG 50.1 in one tab;
photo JPEG 10.0 / 8.5 / 7.7 wall with 5 / 10 / 15 tabs over 90 frames.

End to end: `node e2e.mjs <scene> 600 14 <vt|x264>`, raw RGBA piped to
`ffmpeg -f rawvideo -pix_fmt rgba -s 1920x1080 -r 30 -i - <codec> -pix_fmt yuv420p`.

Parity: `sharp` raw buffers, mean absolute channel difference and share of pixels with any channel off by more than
32, Chromium PNG as reference, frame 60 of each scene.
