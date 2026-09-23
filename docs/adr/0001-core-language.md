# 0001. Write the core in TypeScript, keep Python only as a voice sidecar

- Status: Proposed
- Date: 2026-09-23

## Context

Lucent turns a declarative video file into an mp4. It has two very different kinds of work:

| Part                    | Work                                                                        | Cost profile                                                    |
| ----------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Compiler                | Parse, validate, resolve references, schedule cues, compile state snapshots | Tiny. A few hundred lines of YAML, milliseconds in any language |
| Renderer and components | Draw every frame: photos, text, shapes, motion                              | All of the runtime cost, and all of the visual quality          |
| Voice                   | Text to speech with word timings                                            | Seconds per sentence, cached                                    |

Two facts follow from first principles:

1. **Speed does not come from the compiler's language.** It comes from the renderer (ADR 0003) and from not
   re-rendering what did not change (ADR 0007). Choosing a fast language for the compiler optimises the part that
   already costs nothing.
2. **The part that grows is the component catalog.** Every new episode adds components (Punnett squares, pileups,
   pedigrees) and the escape hatch lets agents write new ones. So the core language is really the choice of
   **where components are written**.

Measured today: the Manim prototype (Python, Cairo) renders at 1.9 s per video second at 1080p30, on one core of 15.

## Options

### TypeScript

- Rendering: components written as JSX that emits SVG (ADR 0003). The browser draws it in preview; Skia (the
  rasteriser inside Chrome, through `@napi-rs/canvas`) draws it in the final render at 0.64 ms per 1080p frame with
  15 workers (spike 002). The hot path is native code without writing Rust.
- Preview: Vite hot module replacement renders the SVG directly, with no screenshots.
- Ecosystem for components: d3, three.js, Lottie, KaTeX, every SVG technique on the web.
- Voice: `onnxruntime-node` 1.30 and `@huggingface/transformers` 4.3 exist, but `kokoro-js` (last release May 2025)
  exposes no word timings.
- Distribution: needs Node. `npx lucent` works, a single binary does not.
- Owner fit: the owner's default stack (TS strict, pnpm).

### Python

- Rendering: Manim (Cairo; 0.21), skia-python 144. Proven by the prototype, and so are its limits: no layout
  engine, no live preview in Manim Community, single-core Cairo.
- Voice and ML: the best ecosystem. Kokoro's Python pipeline returns word timings today.
- Components: Manim mobjects. A good community, far smaller than the web's.
- Distribution: `uvx lucent`. The voice needs no PyTorch once Kokoro runs on its patched ONNX graph (spike 003).

### Rust

- Rendering: vello 0.10 (GPU compute), tiny-skia 0.12 (CPU), cosmic-text 0.19 (shaping), taffy 0.14 (flexbox and
  grid), typst 0.15 (math). Excellent parts, but we would assemble a browser-like stack ourselves: text layout,
  image decoding, SVG, compositing, a preview window.
- Performance and determinism: the best available. A CPU renderer can be byte-identical across runs.
- Distribution: a single binary (still needing ffmpeg and model files).
- Voice: `ort` 2.0 is still a release candidate; Kokoro word timings would need the ONNX export to expose durations
  (unverified) or a whisper alignment step.
- Agents: LLMs write Rust well, but the compile-fix loop is slower, and custom components would require
  recompiling the engine or a plugin ABI.
- This is the language of the Lucent v0.1 draft. Its milestone plan (M0 to M5) is months of work before the first
  real video.

### Go

- Single binary and good concurrency. The 2D graphics, text shaping and ML ecosystems are the weakest of the four.
  Listed for completeness.

### Hybrids

- **TypeScript core plus Rust hot paths** through napi-rs 3.13: add Rust only where a profile proves a bottleneck
  (pixel format conversion, path morphing).
- **Python core plus Rust hot paths** through PyO3 0.29: the same idea around Manim. It keeps Manim's limits on
  layout and preview.

## Weighted comparison

Scores 1 to 5, weights 1 to 5. The weights encode this project's goals: quality explainers, fast iteration,
authored by agents, maintained by one person.

| Criterion                                     | Weight | TS       | Python   | Rust     | Go       |
| --------------------------------------------- | ------ | -------- | -------- | -------- | -------- |
| Rendering and typography quality within reach | 5      | 5        | 3        | 3        | 2        |
| Live preview and iteration loop               | 5      | 5        | 2        | 3        | 2        |
| Time to the first real video                  | 4      | 5        | 4        | 1        | 1        |
| Agents writing specs and components           | 4      | 5        | 4        | 3        | 3        |
| Owner fit and maintainability                 | 4      | 5        | 4        | 2        | 2        |
| Raw performance and determinism               | 3      | 3        | 2        | 5        | 4        |
| Voice and ML ecosystem                        | 2      | 3        | 5        | 3        | 2        |
| Distribution                                  | 2      | 3        | 3        | 5        | 5        |
| Community surface for components              | 2      | 5        | 4        | 2        | 1        |
| **Weighted average**                          |        | **4.55** | **3.32** | **2.87** | **2.32** |

**Sensitivity.** If Lucent were optimised as an open source product and we set time to first video and live preview
to weight 1, and performance and distribution to weight 5, TypeScript still leads (4.17 against Rust's 3.41). Rust
wins only if its rendering and typography score rises to TypeScript's, which means rebuilding the preview, text
layout and component ecosystem that TypeScript gets for free. The ranking is robust to reasonable changes in the weights.

## Decision

The core (parser, validator, scheduler, compiler, components, CLI) is TypeScript. Voice synthesis runs in a Python
sidecar behind a JSON contract (ADR 0004), because Kokoro's text-to-phoneme step (misaki) exists only in Python today. Rust is not
excluded: the rasteriser is already native code behind Node bindings (ADR 0003), and if profiling shows another hot
path, it enters as a napi-rs module behind a TypeScript interface, without moving the core.

With the goals in `docs/goals.md` (local first, fast, cheap for agents), this split puts each concern where it is
cheapest: TypeScript where agents and the owner write code (format, components, CLI), native code where pixels are
made.

## Consequences

- One language for everything that grows: component schemas (zod) live next to components, and the JSON Schema
  that agents read is generated from them. No cross-language code generation.
- The escape hatch is a JSX file that returns SVG, the most widely known component syntax there is.
- Two runtimes on the machine (Node and Python). The CLI hides this; the contract between them is one JSON file
  validated at the boundary.
- No single-binary distribution. Acceptable while the users are the owner and their agents.
- Preview (browser) and final render (Skia) rasterise the same SVG with different engines, so frames are not
  byte-identical across them. Golden tests use a perceptual tolerance.
- **A bad reason to choose Rust**, recorded so it is not rediscovered: learning Rust. It is a legitimate goal, better
  served by a contained napi-rs module later than by the product's core.

Revisit if: the SVG subset (ADR 0003) blocks visuals the owner needs, the native rasterisers miss the render budget,
or a single-binary distribution becomes a hard requirement.
