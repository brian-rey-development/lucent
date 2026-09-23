# Spike 005: Animation model

| | |
|---|---|
| Status | Complete |
| Date | 2026-09-23 |
| Question | How does "declare states, not transitions" produce good motion automatically, as a pure function of time? |
| Informs | ADR 0006 (component contract), ADR 0007 (scene segment cache) |
| Machine | M5 Pro, Node 24.21 |

## 1. Question and why it matters

The format lets authors say what should be on screen next (`$legend: { seq: ATGGTG... }`), never how to get
there. The engine must invent the motion: entrances, exits, tweens, re-layout, continuity across scenes, continuous
motion and morphs. Two constraints from earlier decisions make this harder than in a UI framework:

1. **Every frame must be computable alone** (ADR 0006, ADR 0007), because frames render in parallel on worker threads
   and scenes render as independent cached segments. No per-frame accumulated state, no physics integration.
2. **Defaults must look good without tuning**, because agents will not tune easing curves, and every tuning knob
   costs tokens (`docs/goals.md`).

If the animation model is wrong, the format either loses its "no timestamps, no coordinates" promise (authors start
writing keyframes) or produces motion that looks mechanical, which the owner has already rejected once ("visual
trash").

## 2. Method

- Read the design and documentation of eight systems that derive motion from state: FLIP, Framer Motion layout
  animations, the CSS View Transitions API, Keynote Magic Move, Manim `Transform` and `TransformMatchingTex`, Motion
  Canvas signals, Remotion `interpolatePath`, and the Lucent v0.1 draft's motion rules.
- Worked the maths of closed-form springs, focal-point zoom and log-scale camera interpolation.
- Checked the maintenance and licences of path-morphing libraries (npm registry, 2026-09-23).
- Micro-benchmarked path interpolation and spring evaluation per frame (Appendix A).
- Mapped multimedia-learning research to rules a validator can enforce.
- Replayed the Halden prototype's hand-written motion (episode 1) against the proposed defaults.

## 3. Findings

### F1. Every state-driven system reduces to "match, then interpolate"

All eight systems do the same two things. They **match** elements between the old and new state, then
**interpolate** each matched pair while fading unmatched ones in or out. They differ only in how they match:

| System | Match key | Unmatched elements |
|---|---|---|
| FLIP (Lewis, 2015) | The same DOM node before and after a layout change | Not handled |
| Framer Motion `layout` / `layoutId` | Same component, or same `layoutId` across different trees | `AnimatePresence` keeps removed nodes alive until their exit finishes |
| CSS View Transitions | Same `view-transition-name` | Old snapshot fades out, new fades in |
| Keynote Magic Move | Same object across slides; text by object, word or character | Fade |
| Manim `Transform` | Explicit pair given by the author | Not applicable |
| Manim `TransformMatchingTex` | Equal TeX substrings | `FadeTransformPieces`: fade out and in |
| Motion Canvas | None: imperative tweens on signals | Not applicable |
| Lucent v0.1 draft | Element id; text by shared words; equations by Typst spans | Fade or grow |

Lucent already has the right match key: element ids (`$legend`) and asset points (`$blood/wbc`). **Matching by id is
free and exact**; content matching (text, paths, tiles) is only needed inside one element's state change.

### F2. FLIP needs no measuring in Lucent

FLIP (First, Last, Invert, Play) exists because a browser only knows the new layout after it happens: you measure the
old box, apply the new layout, measure again, apply the inverse transform and animate it back to identity. ADR 0009
gives Lucent every box at compile time for every snapshot, so "FLIP" collapses to **interpolating two known boxes**.
No runtime measuring, no inverse transforms, and it is deterministic. The one lesson worth keeping from Framer
Motion is **scale correction**: when a box changes aspect ratio, its children must not be stretched. Lucent sidesteps
it by interpolating each child's own box rather than scaling a parent.

### F3. Exits need tombstones

Framer's `AnimatePresence` exists because a removed element must stay on screen until its exit animation ends. In a
snapshot model the same rule applies: an element that disappears in snapshot N stays in the compiled track until
`exit.start + exit.dur`. Without this, `hide` would be a cut.

### F4. Springs can be pure functions of time

A spring normally needs per-frame integration (state accumulates), which breaks "every frame alone". A **critically
damped** spring has a closed form. For a move from 0 to 1 starting at rest:

```
x(t) = 1 - (1 + w t) e^(-w t)          w = sqrt(stiffness / mass)
```

It never overshoots, starts with zero velocity, and settles within 1 % when `w t = 6.64`, within 0.1 % when
`w t = 9.23`. The Lucent v0.1 draft's spring (stiffness 170, damping 26, mass 1) has damping ratio
`26 / (2 sqrt(170)) = 0.997`, which is effectively critically damped: `w = 13.0`, 1 % settle in 0.51 s. Evaluating it
for 60 elements costs 0.2 to 0.4 microseconds per frame (Appendix A).

Consequence: to scale a move's duration with its distance, choose `w` from the target duration, `w = 6.64 / d`. The
curve keeps its shape and simply stretches.

Under-damped springs (bounce) also have closed forms, but overshoot reads as playful. For explainers the default
should be critically damped.

### F5. Durations should grow with distance, sub-linearly, and be longer than UI durations

Material 3 defines duration tokens from 50 ms to 1000 ms and says larger, longer-travelling motion should take longer.
Apple's HIG asks for motion that is brief and purposeful. Both target **interactive UI**, where the user has already
decided to look. In an explainer the viewer must first notice the motion, then follow it while listening. The
prototype's hand-tuned durations, which the owner approved, were 0.6 to 1.6 s: roughly 2x UI durations.

Proposed rule (sub-linear, Fitts-like: distant moves take longer, but not proportionally longer):

```
d = clamp(0.35 + 0.55 * sqrt(distance / frame_diagonal), 0.35 s, 1.2 s)
```

For a label moving a quarter of the diagonal: 0.63 s. For a full-diagonal move: 0.9 s. Checked against the
prototype's approved moves; values should be tuned against real frames, not trusted.

### F6. Path morphing: correspondence is the expensive part, and it can be precomputed

| Library | Licence | Last release | Behaviour |
|---|---|---|---|
| flubber 0.4.2 | MIT | 2022-06 | Resamples both shapes and finds the best rotation of point correspondence; handles different point counts; multi-shape split and combine |
| d3-interpolate-path 2.3.0 | BSD-3 | 2022-08 | Extends the shorter segment list; no correspondence search |
| @remotion/paths 4.0.527 | MIT | 2026-09 | Accepted a 4-point and a 3-point path without error and gave a plausible midpoint; no correspondence search |
| polymorph-js 1.0.2 | MIT | 2022-05 | Similar resampling approach |

Measured (Appendix A): flubber spends 1.2 to 4.8 ms **once** computing the correspondence, then 18 to 126 microseconds
per frame. The per-frame cost is three orders of magnitude below the render budget (about 125 ms of CPU per frame
across 15 workers at 0.25 s per video second). The setup cost is small but must be **computed at compile time and
stored in the compiled scene**, so every worker gets identical correspondences (determinism) and none repeats the
work.

All libraries are weak at shapes with different numbers of holes or disconnected parts. Manim solves this by
subdividing curves until both shapes have equal point counts, which also produces odd intermediate shapes when
topologies differ. **When topology differs, cross-fade.** The rule is mechanical: same number of subpaths and
similar area ratio (within 4x): morph; otherwise cross-fade while interpolating the bounding box.

flubber is unmaintained but small and MIT; vendoring it (a few hundred lines) is safer than depending on it.

### F7. Text morphs are a diff problem

Keynote's "match by words or characters" and Manim's `TransformMatchingTex` are both **sequence alignment**. The
standard tool is Myers' O(ND) diff (the algorithm behind `git diff`). Applied to word tokens of the old and new text:

- `keep` tokens travel from their old box to their new box (F2).
- `delete` tokens fade out in place.
- `insert` tokens fade in at their new box, staggered.

This needs per-token boxes from the layout (ADR 0009 must measure words, not only whole text elements). Character
mode is the same algorithm on characters; it looks good for short labels and noisy for sentences, so the default
should be words.

### F8. Bases to sequence is a one-to-many match

`bases: ACGT` followed by `$legend: { seq: ATGGTGCATCTG... }` is not a one-to-one morph: four tiles become 24
letters. The pedagogically right motion (and what the prototype approximated with `Transform`) is **copy
matching**: each tile sends a copy to every position holding its letter, staggered left to right, so the viewer
sees that the sequence is made of exactly those four kinds. This is Manim's `TransformFromCopy` generalised. It is a
match plan with edges `from -> [to, to, ...]`, computed at compile time.

### F9. Zoom-through is a camera problem, and zoom should interpolate in log scale

The prototype's formula `zoom_shift(center, focus, s) = (s - 1) * center - s * focus` is the shift that, after scaling
by `s` about the object's centre, brings the focus point to the frame centre. In camera terms, scaling by `s` about
focus `f` maps each point `p` to `s p + (1 - s) f`. Two lessons from the literature and the prototype:

1. **Interpolate the scale in log space**: `s(u) = s0^(1-u) * s1^u`. Linear scale interpolation makes a zoom feel
   like it accelerates wildly at the end. Van Wijk and Nuij (2003) derive the optimal pan-and-zoom path from the same
   principle: perceived speed is constant when scale changes geometrically.
2. **Hand off before the photo runs out of pixels.** The prototype zoomed the karyotype 9x into chromosome 1 and
   cross-faded to the helix; a raster image zoomed 9x shows its pixels. Handing off at about 3x, while the target
   region still looks sharp, hides this. The incoming element (the helix) starts at the **target region's box as
   it appears at handoff time** and grows to its own layout box. This is the View Transitions idea (bounds tween
   plus cross-fade) applied to two different components, and it is what makes the change of representation read as
   "zooming into the same thing" (semantic zoom).

### F10. Continuous motion must be a function of absolute time, and must ramp

The prototype's photo drift was an updater that accumulated scale each frame, and the helix phase was a tracker
incremented by `dt`. Both break "every frame alone". The fix:

- Continuous motion is a function of `t - born`, where `born` is the element's **absolute** entry time in the video,
  not the scene's time. A kept element (`keep: [$helix]`) then has a continuous phase across scene segments rendered
  separately.
- Motion starts and stops with a speed ramp, never a velocity jump. For a ramp of length `r` to speed `v`:
  `x(t) = v t^2 / (2 r)` for `t < r`, and `v (t - r / 2)` after. Closed form, pure.
- Stochastic motion (a wobble, particles) uses seeded hash noise keyed by element id and time, never `Math.random`.

### F11. Segment caching must key on compiled tracks, not source text

ADR 0007 keys each scene segment by "a hash of the compiled scene". With `keep` and absolute-time continuous motion,
an edit in scene 3 can change what a kept element looks like in scene 4 (its `born`, its last keyframe, its phase).
The segment key must therefore be **the hash of every track's samples that intersect the scene's time range**
(keyframes, continuous functions and match plans active in that range), plus assets, audio, engine version and render
options. Keying on the scene's source text alone would reuse stale segments.

### F12. Pedagogy: animation helps only when it is slow, sparse and congruent

The research is more sceptical than the tools. Tversky, Morrison and Betrancourt (2002) found that many studies
showing animation beating static graphics compared unequal content; their two principles are **congruence** (the
motion should match the concept's structure) and **apprehension** (it must be slow and clear enough to perceive).
Mayer's multimedia principles (Mayer, 2020) give rules an engine can check:

| Principle | Meaning | Enforceable rule |
|---|---|---|
| Temporal contiguity | Show a thing while it is being said | Cues bind steps to words (ADR 0005); warn when an unanchored step fires more than 2 s from any narration |
| Signaling | Cue what matters | `ring`, `highlight`, `focus` exist; warn when a scene has narration and no emphasis |
| Segmenting | Learner-paced chunks | Warn when a scene runs over 45 s without a new visual state |
| Redundancy | Do not show the narration as on-screen text | Warn when on-screen text shares 8 or more consecutive words with the narration |
| Coherence | No decorative motion | Continuous motion only on components that declare it (helix, drift) |
| Spatial contiguity | Labels next to what they label | Label placement is the engine's (ADR 0009) |

Cognitive load theory (Sweller, 1988) supports the Lucent v0.1 draft's concurrency cap: the eye can track only a few
independent motions at once. Three independent motion groups at a time, 80 ms stagger within a group and 0.8 s of
dwell after a reveal are reasonable starting values, and match what the prototype did by hand.

3Blue1Brown's style, visible across its videos and the Manim library it built, applies the same ideas: one change at
a time, things transform instead of cutting, and the viewer's eye is anchored to something that persists.

## 4. Options compared

| Option | Example | Tokens per scene | Determinism and parallel frames | Agent error rate | Expressiveness |
|---|---|---|---|---|---|
| A. Imperative timeline | Manim `play` / `wait`, Motion Canvas generators | High: every motion written | Only if no accumulated state | High: timing and ordering bugs | Unlimited |
| B. Author-written keyframes | After Effects, Remotion `interpolate` | Highest | Good | High: numbers everywhere | Unlimited |
| **C. Declared states, engine-derived motion, compiled to tracks** | Keynote Magic Move, Framer `layout`, View Transitions | Lowest | Good, if tracks are closed-form | Low: states only | Bounded by the match and interpolation rules; escape hatch via components |
| D. Stateful physics at runtime | react-spring's runtime integration | Low | Poor: needs frame history | Low | Medium |

Option C authored, compiled into option B internally. Authors and agents write states; the compiler writes
keyframe tracks; the renderer evaluates tracks at any `t`.

## 5. Recommendation

### 5.1 Pipeline

```
states per step (from YAML)
  -> match        ids across snapshots; inside a change: text diff, path correspondence, tile copy plan
  -> plan motion  enter / exit / tween per element, durations from distance, stagger, concurrency cap
  -> tracks       one track per element: keyframes + continuous functions + match plans   (compiled.json)
  -> evaluate     stateAt(track, t) for any absolute t, pure, in any worker
```

### 5.2 Snapshot and track data model

```ts
type Seconds = number;
type Box = { x: number; y: number; w: number; h: number };      // frame units, from layout (ADR 0009)
type Ease = "out" | "in" | "inOut" | { spring: { w: number } };  // spring = critically damped, closed form
type Motion = { start: Seconds; dur: Seconds; ease: Ease };

interface ElementTrack {
  id: string;                      // "$legend"; asset points are "$blood/wbc"
  kind: string;                    // component name
  born: Seconds;                   // absolute video time; origin of continuous motion
  enter: { style: EnterStyle; motion: Motion };
  exit?: { style: ExitStyle; motion: Motion };   // tombstone: the track lives until exit ends (F3)
  keyframes: Keyframe[];           // sorted by t
  continuous?: Continuous[];       // e.g. { kind: "turn", speed, ramp }, { kind: "drift", focus, rate, ramp }
}

interface Keyframe {
  t: Seconds;                      // change start, absolute
  props: Record<string, unknown>;  // full props after the change, validated by the component schema
  box: Box;
  motion: Motion;
  match?: MatchPlan;               // precomputed at compile time (F6, F7, F8)
}

type MatchPlan =
  | { kind: "text"; ops: Array<{ op: "keep" | "insert" | "delete"; from?: number; to?: number }> }
  | { kind: "path"; from: number[][]; to: number[][] }             // resampled, aligned rings
  | { kind: "copy"; edges: Array<{ from: number; to: number[] }> }  // one-to-many tiles
  | { kind: "crossfade" };

interface Camera { keyframes: Array<{ t: Seconds; focus: [number, number]; scale: number; motion: Motion }> }
interface Handoff { t: Seconds; from: string; to: string; fromBox: Box }  // zoom-through (F9)

interface CompiledScene {
  id: string; start: Seconds; end: Seconds;
  camera: Camera; tracks: ElementTrack[]; handoffs: Handoff[];
}
```

Evaluation at time `t`: take the last keyframe with `k.t <= t`, compute `u = ease(clamp((t - k.t) / dur))`, and
interpolate from the previous keyframe's props to `k.props`.

### 5.3 Who interpolates: the engine, guided by the schema

Components should not write tweening code. Each prop in a component's zod schema declares how it interpolates, as
metadata:

| `interp` | Behaviour |
|---|---|
| `lerp` | Numbers, positions, sizes |
| `color` | Interpolated in OKLab (perceptually uniform; no muddy midpoints) |
| `box` | Box interpolation (F2) |
| `path` | Uses the precomputed `path` match plan, else cross-fade |
| `text` | Uses the `text` match plan |
| `discrete` | Switches at `u = 0.5` with a short cross-fade |

The engine hands the component interpolated props plus `u`, `match` and `age` (`t - born`). A component only draws.
This keeps components tiny, which matters because agents will write them.

### 5.4 Default motion rules

| Event | Default motion | Duration | Easing |
|---|---|---|---|
| Enter, generic | Fade in and rise 12 px (at 1080p) | 0.5 s | out (cubic) |
| Enter, marks (`ring`, `underline`, `arrow`, `measure`) | Draw-on along the stroke | 0.6 to 0.9 s, by path length | inOut |
| Enter, photo | Fade in from scale 0.94 | 1.0 s | out |
| Exit | Reverse of the entrance | 0.6 x entrance | in (cubic) |
| Prop change (number, opacity, colour) | Interpolate by `interp` | 0.5 s | inOut |
| Move or resize (re-layout) | Box interpolation | By distance (F5) | Spring, `w = 6.64 / d` |
| Text change | Word diff: keep travels, delete fades, insert fades in with stagger | By longest travel | Spring |
| Tiles to sequence | Copy matching, left to right | 1.2 to 1.6 s total | inOut |
| Path change | Morph if compatible (F6), else cross-fade plus box tween | By distance | inOut |
| Same id, different component across scenes | Box tween plus cross-fade | By distance | inOut |
| Zoom-through | Log-scale camera zoom about the focus; handoff at 3x with a 0.4 s cross-fade; incoming starts at the target region's box | 1.6 s | inOut |
| Continuous motion | Function of `t - born`, 0.5 s speed ramp in and out | Until exit | Ramp |
| Stagger | 80 ms between siblings, total stagger capped at 0.6 s | | |
| Concurrency | At most 3 independent motion groups at once; extra groups queue | | |
| Dwell | At least 0.8 s of stillness after a reveal before an unanchored step | | |

All values are theme tokens (`motion.base`, `motion.stagger`, ...), not constants in components.

### 5.5 Validator rules proposed (W41x, pacing and pedagogy)

| Code | Rule |
|---|---|
| W410 | More than 3 independent motion groups at once |
| W411 | Unanchored step less than the dwell after a reveal |
| W412 | Step more than 2 s from any narration (temporal contiguity) |
| W413 | Scene over 45 s without a new visual state (segmenting) |
| W414 | On-screen text repeats 8 or more consecutive narration words (redundancy) |
| W415 | Scene with narration and no emphasis step (signaling) |

Codes W41x avoid the W402 already used in spike 001 for sentence length.

### 5.6 Changes to existing records

- **ADR 0006**: add that props declare an `interp` strategy in their schema, and that the engine, not the component,
  interpolates. Components receive interpolated props, `u`, `match` and `age`.
- **ADR 0007**: the segment cache key must hash the compiled track samples that intersect the scene's time range
  (F11), not only the scene's own compiled content. Evaluation uses absolute video time, so motions may cross scene
  boundaries safely.
- **New ADR 0011, motion defaults and pacing rules**: the rules table in 5.4 as theme tokens, and W410 to W415.

## 6. Risks and unknowns

- **Defaults can look generic.** Automatic motion risks the "slide deck" feel. Mitigation: tune the table against
  side-by-side frames of the approved Manim episode before freezing the tokens.
- **The duration formula (F5) is a proposal.** Validated only against the prototype's hand-tuned values, not against
  viewers.
- **Word-level boxes** are required for text morphs; ADR 0009's layout must measure per token. If it measures only
  whole elements, text changes degrade to cross-fades.
- **Path morph quality** for complex biological shapes (chromosomes, cells) is untested; F6's benchmark used simple
  shapes. Expect cross-fade fallbacks to be common.
- **Zoom handoff threshold** (3x) depends on the source photo's resolution; it should be computed from pixels per
  frame unit, not fixed.
- **flubber is unmaintained.** Vendoring it makes us its maintainers.
- **The pedagogy rules may be noisy.** W412 to W415 should start as warnings and be tuned on real episodes.

## 7. Sources

- Paul Lewis, "FLIP Your Animations", 2015: https://aerotwist.com/blog/flip-your-animations/
- Motion (Framer Motion) layout animations: https://motion.dev/docs/react-layout-animations
- CSS View Transitions Module Level 1 (W3C): https://www.w3.org/TR/css-view-transitions-1/ and MDN:
  https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API
- Apple Keynote User Guide, "Add Magic Move transitions": https://support.apple.com/guide/keynote/
- Manim Community, `transform_matching_parts`:
  https://docs.manim.community/en/stable/reference/manim.animation.transform_matching_parts.html
- Motion Canvas, signals: https://motioncanvas.io/docs/signals
- Remotion `interpolatePath`: https://www.remotion.dev/docs/paths/interpolate-path
- flubber: https://github.com/veltman/flubber ; d3-interpolate-path: https://github.com/pbeshai/d3-interpolate-path
- Material Design 3, easing and duration: https://m3.material.io/styles/motion/easing-and-duration
- Apple Human Interface Guidelines, Motion: https://developer.apple.com/design/human-interface-guidelines/motion
- Ryan Juckett, "Damped Springs": http://www.ryanjuckett.com/damped-springs/
- Björn Ottosson, "A perceptual color space for image processing" (OKLab), 2020:
  https://bottosson.github.io/posts/oklab/
- Jarke J. van Wijk and Wim A. A. Nuij, "Smooth and efficient zooming and panning", IEEE InfoVis 2003.
- Eugene W. Myers, "An O(ND) difference algorithm and its variations", Algorithmica 1(2), 1986.
- Richard E. Mayer, *Multimedia Learning*, 3rd edition, Cambridge University Press, 2020.
- John Sweller, "Cognitive load during problem solving: effects on learning", Cognitive Science 12(2), 1988.
- Barbara Tversky, Julie B. Morrison and Mireille Betrancourt, "Animation: can it facilitate?", International
  Journal of Human-Computer Studies 57(4), 2002.
- Bay-Wei Chang and David Ungar, "Animation: from cartoons to the user interface", UIST 1993.
- Frank Thomas and Ollie Johnston, *The Illusion of Life: Disney Animation*, 1981 (slow in and slow out, arcs).

## Appendix A. Micro-benchmark

Throwaway script in the session scratchpad (`research/005/bench.mjs`), not part of Lucent. 900 frames (30 s at
30 fps) per case, Node 24.21 on the M5 Pro, two runs, second run shown.

| Case | Setup (once) | Per frame |
|---|---|---|
| flubber, circle (64 points) to star (10 points), `maxSegmentLength` 10 | 1.23 ms | 17.2 µs |
| flubber, same shapes, `maxSegmentLength` 2 | 4.81 ms | 126.4 µs |
| d3-interpolate-path, circle to rectangle | 0.54 ms | 18.4 µs |
| @remotion/paths, compatible rectangles | 0.02 ms | 4.9 µs |
| Closed-form critically damped spring, 60 elements | 0.01 ms | 0.2 µs |

Reading: motion evaluation is negligible next to rasterisation. The only cost worth managing is morph setup, which
belongs in the compiler for determinism more than for speed.
