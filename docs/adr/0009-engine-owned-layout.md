# 0009. The engine computes layout at compile time

- Status: Proposed (revised after spike 004)
- Date: 2026-09-23

## Context

The prototype's layout bugs (labels over captions, cards off-screen) were found only by rendering and looking at
stills: three render-and-inspect cycles on episode 1. For an agent, looking means vision tokens (about 1,500 per
image) and render time. The goals (`docs/goals.md`) require `check` to find these problems in under 200 ms, as text,
without rendering.

A browser can compute layout, but only inside a browser, at render time. The engine cannot check boxes it does not
know.

## Decision

The compiler computes every element's box for every state snapshot:

- Layout modes stay small: `stack`, `row`, `split`, full-bleed layers (backdrop, content, overlay, caption) and marks
  anchored to image points.
- Text is measured with harfbuzzjs (the shaper Chrome uses, compiled to WebAssembly: 15.7 µs per string, widths
  identical to fontkit and Skia; spike 004), with measurements cached in `.lucent/`. Fonts are resolved by file, never
  by family name, so measurement and rasteriser always use the same face.
- Labels use a greedy placer over 8 candidate positions (exhaustive search when a frame has 4 labels or fewer), with
  the cost summed over frames sampled during motion, and keep one side for their whole time on screen.
- Boxes go into the compiled snapshot, so components only draw; they never measure.

`check` runs the layout rules on every snapshot and on sampled frames during motion: overlap (W301), off-screen
(W302), outside the safe area (W303), text below minimum size (W304).

## Consequences

- An agent learns about a layout problem as a 40-token line with a fix, not by rendering and inspecting an image.
- Components become simpler: they receive their box.
- The engine owns a layout algorithm. It must stay small (0.5 ms for a stack, against 22.6 ms for yoga plus 21.5 ms
  to import it; spike 004). If layouts outgrow it, `yoga-layout` (MIT) is the upgrade path.
- Measured parts put a full `check` at an estimated 60 to 100 ms, inside the 200 ms budget.
