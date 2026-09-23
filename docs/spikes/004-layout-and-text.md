# Spike 004: Layout, text measurement and label placement

| | |
|---|---|
| Status | Complete |
| Date | 2026-09-23 |
| Question | How does the engine compute every element's box at compile time, fast enough for `check` (< 200 ms) and exactly enough to match the rasteriser, and how do labels on image points place themselves without collisions? |
| Informs | ADR 0009 (engine-owned layout), ADR 0006 (component contract) |
| Machine | M5 Pro, 15 cores, 24 GB, Node 24.21 |

## 1. Question and why it matters

`docs/goals.md` sets the rule **text checks first, pixels last**: overlaps, off-screen elements and safe-area problems
must reach an agent as ~40-token lines from `lucent check`, in under 200 ms, without rendering a frame or spending
~1,500 vision tokens on an image. That only works if three things hold:

1. The engine can measure text **exactly as the rasteriser will draw it**. A box that is 10 px off produces false
   overlaps or misses real ones, and an agent will stop trusting `check`.
2. Layout for every state snapshot of an episode is cheap enough to recompute on every `check`.
3. Labels anchored to image points (`ring` + `label`) can choose their side automatically, including while the photo
   drifts, so authors never write coordinates.

## 2. Method

Throwaway experiments in the session scratchpad (`research/004/`), pnpm, Node 24.21. Nothing was built in Lucent.

- **Exp 1, text accuracy.** Six strings from the episode 1 script (labels, captions, a DNA sequence, a kerning
  torture string) at 32 px, in three bundled OFL faces (Inter Regular, Inter Bold, JetBrains Mono Regular) and three
  macOS system faces (Avenir Next Regular and Bold, Menlo). Each string measured with fontkit 2.0.4, opentype.js
  2.0.0, harfbuzzjs 1.6.2 and `@napi-rs/canvas` 1.0.9 (Skia), then rasterised by `@resvg/resvg-js` 2.6.2 and
  measured two ways: resvg's own `getBBox()` and a scan of the rendered pixels' alpha channel.
- **Exp 2, text speed.** 300 unique phrases and 6,000 calls (the brief's episode size: ~300 elements across ~20
  snapshots) through each library; module import and font open times.
- **Exp 3, layout, labels and checks.** yoga-layout 3.2.1 against a 15-line stack function (400 snapshots x 15
  nodes); a greedy label placer on the real blood-smear geometry (3 labels, 8 candidate positions, 12 frames sampled
  over a 6 s drift); pairwise overlap and safe-area checks over a full 6-minute episode sampled every 5 frames.
- **Exp 4, check budget.** Node start and the import cost of the modules `check` needs (yaml, zod, harfbuzzjs,
  fontkit).
- **Desk research** on point-feature label placement and on how Manim, Remotion, Motion Canvas, Satori and Typst lay
  out.

## 3. Findings

### 3.1 Every shaping library agrees on advance widths, and ink boxes match resvg exactly (measured)

For the three bundled OFL faces, fontkit, harfbuzzjs and Skia `measureText` returned **identical advance widths** to
0.1 px on all 18 string-and-face pairs. fontkit's ink bounding box matched resvg's `getBBox()` **to 0.0 px** on all 18,
and the pixel-scanned ink width was within **1.5 px** of both (the difference is antialiasing coverage, not
measurement error).

| Face | String | Advance (all libs) | fontkit ink | resvg bbox | resvg pixels |
|---|---|---|---|---|---|
| Inter Regular 32 px | no nucleus | 165.4 | 161.4 | 161.4 | 162 |
| Inter Regular 32 px | white blood cell · nucleus kept | 457.5 | 455.8 | 455.8 | 456 |
| Inter Bold 32 px | Human blood smear · Wright's stain | 557.8 | 553.7 | 553.7 | 554 |
| JetBrains Mono 32 px | ATGGTGCATCTGACTCCTGAGGAG | 460.8 | 456.6 | 456.6 | 458 |

Full table in the appendix. This is expected from first principles: resvg shapes with rustybuzz (a Rust port of
HarfBuzz) and reads the same outlines, so a HarfBuzz-based measurer predicts it exactly. Advance width minus ink
width is the side bearing (2 to 6 px here), which is why layout must use one box definition consistently.

### 3.2 Stock opentype.js cannot read the fonts we want (measured)

opentype.js 2.0.0 threw `substitutionType : 62 lookupType: 6 - substFormat: 2 is not yet supported` on Inter,
Inter Bold and JetBrains Mono: it does not implement a common GSUB chained-context format. Satori works around this by
depending on a fork (`@shuding/opentype.js` 1.4.0-beta.0). Stock opentype.js is ruled out.

### 3.3 Resolving fonts by family name is unsafe (measured)

With the macOS `Avenir Next.ttc` collection registered, `@napi-rs/canvas` resolved `400 "Avenir Next"` to the
**Bold** face: "no nucleus" measured 166.8 px (the Bold advance) instead of 158.5 px, and "white blood cell · nucleus
kept" 473.3 px instead of 442.5 px, a 31 px error. fontkit and resvg, given the face explicitly, agreed with each
other. Family-plus-weight lookup through a collection is engine-specific, and two engines can silently pick different
faces.

Consequence: fonts must be resolved **by file**, once, by the engine, and the same file handed to the measurer, the
rasteriser and the browser preview (`@font-face` pointing at the same file).

### 3.4 System fonts cannot ship; OFL fonts measure identically (desk research, measured)

The prototype's Avenir Next and Menlo are macOS system fonts, licensed for use on Apple systems, not for
redistribution. A theme that depends on them breaks on Linux and CI and cannot be bundled. Inter and JetBrains Mono
(SIL Open Font License 1.1, verified in the downloaded `LICENSE.txt`) measured with the same exactness as above, so
bundling OFL static faces costs nothing in accuracy. Static instances are preferred to variable fonts: every engine
here handles static TTFs identically, while variable-axis support differs between engines (not tested).

### 3.5 Measurement is fast enough; HarfBuzz is the fastest cold option (measured)

| Library | Import | Per unique string | 6,000 calls, no cache | With a (font, string) cache |
|---|---|---|---|---|
| harfbuzzjs 1.6.2 (WASM) | 2.7 ms, first face and shape 2.5 ms | 15.7 us | 61.0 ms | ~5 ms (300 unique) |
| `@napi-rs/canvas` 1.0.9 | 92 to 106 ms | 11.7 us | 61.1 ms | ~4 ms |
| fontkit 2.0.4 | 21 to 33 ms | 130 to 170 us | 774 ms | ~40 ms |

Measurements are size-independent in font units, so the cache key is (font file hash, string, OpenType features),
and results scale linearly with font size. Persisting the cache in `.lucent/` makes repeated `check` runs pay only
for new strings. harfbuzzjs also exposes `glyphExtents` (ink boxes) and `hExtents` (ascender, descender, line gap),
which is everything the layout needs.

### 3.6 Our layout modes do not need a layout engine (measured)

| Layout | Import | 400 snapshots x 15 nodes |
|---|---|---|
| yoga-layout 3.2.1 (WASM flexbox) | 21.5 ms | 22.6 ms |
| Own stack function (15 lines) | 0 | 0.5 ms |

Both fit the budget. The spike 001 modes (`stack`, `row`, `split`, full-bleed layers, marks anchored to image points)
are a vertical or horizontal sum of measured sizes plus gaps, centring and fixed slots. None needs wrapping, grow and
shrink, or grid. An own implementation is 40x faster, has no dependency, and yields boxes as pure functions that are
trivial to unit test. yoga is the documented upgrade path if a mode ever needs real flexbox. taffy (Rust) was not
evaluated: no maintained WASM build for Node was found in the time available, and yoga already covers that role.

### 3.7 Label placement: a solved problem at our density (desk research, measured)

Point-feature label placement is NP-hard in general (Formann and Wagner 1991). Christensen, Marks and Shieber (1995)
compared algorithms on dense maps: greedy placement is fast but leaves conflicts that simulated annealing resolves.
Imhof (1975) gives the cartographic preference order for candidate positions around a point. Dynamic labelling
research (Been, Daiches and Yap 2006) adds the rule that matters for video: labels must not jump or flicker while the
view moves.

Our density is tiny: 1 to 6 free labels per frame (the karyotype's 24 pair numbers are fixed text at points, not free
labels). At that size, the approach is:

1. For each label, 8 candidate positions around its mark (preference order: above, above-right, right, below-right,
   below, below-left, left, above-left), offset by the mark's radius plus a gap.
2. Cost of a candidate = overlap area with obstacles (caption chip, other marks, already placed labels) + area outside
   the safe area, **summed over frames sampled across the label's whole time on screen**, plus a small preference
   penalty.
3. Choose once per label, never per frame, so a label keeps its side for its whole life (Been et al.'s consistency
   rule). Longest labels first.
4. If the best cost is still above zero, emit W301 with the fix ("shorten the label or choose another point").

Measured on the real blood-smear geometry (3 labels, 12 frames over a 6 s drift, caption chip as obstacle): **37 us
per scene**, all three placed with zero conflicts. The solver chose below for `rbc_1`, above for `rbc_2` and above for
the white cell: the same sides that were hand-placed in the Manim prototype after three render-and-inspect cycles.
For up to 4 labels, exhaustive search (8^4 = 4,096 combinations) is also affordable (estimated under 20 ms) and
avoids greedy's order sensitivity; above that, greedy plus a few annealing passes, as Christensen et al. recommend.

### 3.8 Image points map to screen space in closed form (derived, tested in exp 3)

Store points as `(u, v, r)`: `u`, `v` as fractions of the image's width and height, and `r` as a fraction of the
image's **shorter side** (spike 001 said "scene units"; that does not survive a change of fit or size). For an image
`w x h` shown with scale `k` and offset `(ox, oy)` (for `cover`, `k = max(W / w, H / h)`, centred), and a push-in of
zoom `z(t)` about focus `F`:

```
x = F.x + z(t) * (ox + u * w * k - F.x)
y = F.y + z(t) * (oy + v * h * k - F.y)
radius = z(t) * r * min(w, h) * k
```

This is a pure function of time, which is what ADR 0006 requires. It also gives every mark's box at any sampled
frame for the checks in 3.9.

### 3.9 Rule checks over a whole episode are cheap (measured)

Pairwise overlap plus safe-area checks for 15 boxes on 2,160 sampled frames (6 minutes at 30 fps, every 5th frame):
**2.9 ms**. Checks run on every settled state and on sampled frames during motion. Proposed rules:

| Code | Rule | Box used |
|---|---|---|
| W301 | Two elements overlap by more than 2 percent of the smaller one | Logical box plus padding |
| W302 | An element leaves the frame while not exiting | Logical box |
| W303 | An element crosses the 5 percent safe margin | Logical box |
| W304 | Text renders below 28 px at 1080p at any sampled frame | Font size times current scale |

Elements inside an exit or zoom-through transition are exempt, otherwise every `zoom` step would report W302 and
W304.

### 3.10 How other tools do it (desk research)

| Tool | Where layout happens | Can a checker see boxes before rendering? |
|---|---|---|
| Manim | Author code (`arrange`, `next_to`, coordinates); no layout engine | No |
| Remotion | Chromium lays out HTML and CSS at render time; `@remotion/layout-utils` measures text in the DOM | Only inside a browser |
| Motion Canvas | Its layout nodes use the browser's flexbox at runtime | Only inside a browser |
| Satori | yoga for flexbox, a forked opentype.js for text, output SVG | Yes: the closest prior art to our approach |
| Typst | Its own layout engine over shaped text, at compile time | Yes, internally |

### 3.11 The whole `check` fits the budget (measured parts, estimated total)

| Part | Cost |
|---|---|
| Node start | 10 to 20 ms (measured) |
| Import yaml, zod, harfbuzzjs | 30 to 50 ms warm, 72 ms first run (measured) |
| Text measurement, 300 unique strings, cold cache | ~5 ms (measured) |
| Layout, 400 snapshots | 0.5 ms (measured) |
| Labels, 12 scenes | < 1 ms (estimated from 37 us per scene) |
| Rule checks, whole episode | 2.9 ms (measured) |
| **Total** | **~60 to 100 ms (estimated)**, against a 200 ms budget |

## 4. Options compared

| Decision | Option | Accuracy vs resvg | Speed | Verdict |
|---|---|---|---|---|
| Text measurement | **harfbuzzjs** | Exact (same shaping family as resvg's rustybuzz) | 2.7 ms import, 15.7 us per string | **Chosen** |
| | `@napi-rs/canvas` | Exact when the face is unambiguous; picked the wrong face from a collection | ~100 ms import | Only if Skia is the rasteriser, for consistency |
| | fontkit | Exact | 10x slower per string | Fallback |
| | opentype.js 2.0.0 | Fails on Inter and JetBrains Mono | n/a | Rejected |
| | Browser DOM | Exact for the preview only | Needs a browser | Rejected for `check` |
| Layout | **Own small algorithm** | n/a | 0.5 ms per episode | **Chosen** |
| | yoga-layout | n/a | 22 ms + 21 ms import | Upgrade path |
| | taffy (WASM) | n/a | Not evaluated | Not needed |
| Labels | Fixed side per label | Collides silently | Free | Rejected |
| | **Greedy over 8 candidates, cost summed over sampled frames** | No conflicts on the real case | 37 us per scene | **Chosen** |
| | Exhaustive (<= 4 labels) | Optimal | < 20 ms estimated | Use for small counts |
| | Simulated annealing | Best on dense maps | Slower | Only if density grows |
| Fonts | System fonts by family name | Wrong face observed | n/a | Rejected |
| | **Bundled OFL static faces, resolved by file** | Exact | n/a | **Chosen** |

## 5. Recommendation

1. **Fonts are files, not names.** Themes declare font files; Lucent bundles OFL static faces (candidates: Inter for
   text, JetBrains Mono for sequences and code). The engine resolves each face once and passes the same file to the
   measurer, the rasteriser and the preview's `@font-face`. The prototype's Avenir Next look needs an OFL replacement,
   which the owner should choose by eye.
2. **Measure with harfbuzzjs**, in font units, cached by (font hash, string, features) in `.lucent/`. Logical box =
   advance width x (ascender - descender); ink box from `glyphExtents` when a component needs it.
3. **Own layout** for `stack`, `row`, `split`, layers and anchored marks; yoga-layout only if a future mode needs real
   flexbox.
4. **Labels**: greedy over 8 Imhof-ordered candidates, cost summed over frames sampled across the label's lifetime,
   one side per label for its whole life; exhaustive when there are 4 or fewer. Unresolvable conflicts become W301.
   Offer `side:` as an optional hint (a direction, not a coordinate).
5. **Image points** stored as `(u, v, r)` with `r` a fraction of the image's shorter side; screen positions from the
   closed form in 3.8.
6. **Checks** W301 to W304 on settled states plus frames sampled every 5 frames during motion, exempting exiting and
   zooming elements.

Recommended document changes:

- ADR 0009: replace "library chosen in spike 001" with harfbuzzjs; add "fonts resolved by file" and "own layout, yoga
  as upgrade path".
- `docs/goals.md`: add "fonts are bundled OFL files" under local first (works identically on any machine and in CI).
- Spike 001 section 4.5: `r` becomes a fraction of the image's shorter side.

## 6. Risks and unknowns

- **Line wrapping** was not measured. Multi-line text needs Unicode line breaking (UAX #14); a greedy word wrap on
  measured widths is likely enough for captions and cards.
- **The chosen rasteriser** (spike 002) must be fed the same font files. If Skia is chosen, repeat exp 1 with Skia
  rasterising, with single-face files registered (the face mix-up in 3.3 was a lookup problem, not a shaping one).
- **Browser preview fallback**: if a glyph is missing from the bundled font, the browser falls back to a system font
  and preview drifts from the render. `check` should report missing glyphs (a new E-code).
- **Label stability across edits**: a small edit can flip a label to another side between two renders (never within
  one). Acceptable; `side:` pins it.
- **Variable fonts, colour emoji and right-to-left scripts** were not tested and are out of scope.
- **Dense scenes** (many free labels) were not tested beyond the blood smear; the karyotype's pair numbers are fixed
  text and do not use the placer.

## 7. Sources

Measured locally (versions in section 2). Desk references, cited from knowledge and not re-fetched during this spike:

- Christensen, J., Marks, J., Shieber, S. (1995). An empirical study of algorithms for point-feature label
  placement. ACM Transactions on Graphics 14(3). https://doi.org/10.1145/212332.212334
- Imhof, E. (1975). Positioning names on maps. The American Cartographer 2(2).
  https://doi.org/10.1559/152304075784313304
- Formann, M., Wagner, F. (1991). A packing problem with applications to lettering of maps. Symposium on
  Computational Geometry. https://doi.org/10.1145/109648.109685
- Been, K., Daiches, E., Yap, C. (2006). Dynamic map labeling. IEEE TVCG 12(5).
  https://doi.org/10.1109/TVCG.2006.136
- HarfBuzz for JavaScript: https://github.com/harfbuzz/harfbuzzjs
- fontkit: https://github.com/foliojs/fontkit
- opentype.js: https://github.com/opentypejs/opentype.js
- resvg-js: https://github.com/thx/resvg-js
- @napi-rs/canvas: https://github.com/Brooooooklyn/canvas
- Yoga: https://github.com/facebook/yoga
- Satori: https://github.com/vercel/satori
- Remotion layout utils: https://www.remotion.dev/docs/layout-utils/
- Motion Canvas layouts: https://motioncanvas.io/docs/layouts
- Typst: https://github.com/typst/typst
- Inter (OFL 1.1): https://github.com/rsms/inter
- JetBrains Mono (OFL 1.1): https://github.com/JetBrains/JetBrainsMono
- SIL Open Font License: https://openfontlicense.org

## Appendix: experiment details

Scripts (scratchpad, not kept): `exp1.mjs` (accuracy, OFL faces), `exp1b.mjs` (accuracy, macOS faces), `exp2.mjs`
(speed), `exp3.mjs` (layout, labels, checks), `exp4.mjs` and `exp5.mjs` (imports, HarfBuzz cold start).

**Exp 1, OFL faces, 32 px, widths in px (measured).** `adv` is identical across fontkit, harfbuzzjs and Skia.

| Face | String | adv | fontkit ink | Skia ink | resvg bbox | resvg pixels |
|---|---|---|---|---|---|---|
| Inter | no nucleus | 165.4 | 161.4 | 162.5 | 161.4 | 162 |
| Inter | white blood cell · nucleus kept | 457.5 | 455.8 | 456.1 | 455.8 | 456 |
| Inter | ≈ 30 trillion cells in a human body | 509.3 | 505.8 | 507.3 | 505.8 | 507 |
| Inter | Human blood smear · Wright's stain | 539.2 | 534.0 | 535.3 | 534.0 | 535 |
| Inter | AVATAR WAVE To Ty | 311.7 | 310.0 | 311.7 | 310.0 | 311 |
| Inter | ATGGTGCATCTGACTCCTGAGGAG | 524.0 | 521.2 | 522.2 | 521.2 | 522 |
| Inter Bold | no nucleus | 171.4 | 168.2 | 168.5 | 168.2 | 169 |
| Inter Bold | white blood cell · nucleus kept | 471.4 | 470.3 | 471.7 | 470.3 | 471 |
| Inter Bold | ≈ 30 trillion cells in a human body | 523.6 | 520.6 | 521.3 | 520.6 | 521 |
| Inter Bold | Human blood smear · Wright's stain | 557.8 | 553.7 | 553.9 | 553.7 | 554 |
| Inter Bold | AVATAR WAVE To Ty | 322.6 | 321.4 | 322.4 | 321.4 | 322 |
| Inter Bold | ATGGTGCATCTGACTCCTGAGGAG | 537.4 | 535.1 | 536.4 | 535.1 | 536 |
| JetBrains Mono | no nucleus | 192.0 | 186.3 | 187.8 | 186.3 | 187 |
| JetBrains Mono | white blood cell · nucleus kept | 595.2 | 591.6 | 593.0 | 591.6 | 592 |
| JetBrains Mono | ≈ 30 trillion cells in a human body | 672.0 | 668.0 | 668.8 | 668.0 | 669 |
| JetBrains Mono | Human blood smear · Wright's stain | 652.8 | 646.9 | 648.6 | 646.9 | 647 |
| JetBrains Mono | AVATAR WAVE To Ty | 326.4 | 323.1 | 324.2 | 323.1 | 324 |
| JetBrains Mono | ATGGTGCATCTGACTCCTGAGGAG | 460.8 | 456.6 | 457.6 | 456.6 | 458 |

**Exp 1b, macOS faces, 32 px (measured).** fontkit and resvg given the face explicitly; Skia given family and
weight.

| Face | String | fontkit adv | Skia adv | fontkit ink | resvg bbox |
|---|---|---|---|---|---|
| AvenirNext-Regular | no nucleus | 158.5 | **166.8** | 154.3 | 154.3 |
| AvenirNext-Regular | white blood cell · nucleus kept | 442.5 | **473.3** | 441.2 | 441.2 |
| AvenirNext-Regular | ATGGTGCATCTGACTCCTGAGGAG | 521.9 | 522.2 | 518.7 | 518.7 |
| AvenirNext-Bold | no nucleus | 166.8 | 166.8 | 163.9 | 163.9 |
| Menlo-Regular | no nucleus | 192.7 | 192.7 | 186.4 | 186.4 |

**Exp 3 label geometry.** Blood smear 3264 x 2448 in cover fit at 1920 x 1080; points `rbc_1 (0.26, 0.30, 0.06)`,
`rbc_2 (0.75, 0.62, 0.06)`, `wbc (0.46, 0.41, 0.11)`; label boxes 170 x 44, 170 x 44, 470 x 44; drift of 6 percent
zoom per second (estimated from the prototype's push-in rate) about `wbc`; caption chip 620 x 90 bottom left as an
obstacle; 12 frames sampled over 6 s. Synthetic data for the layout and rule-check timings: seeded random sizes and
positions.
