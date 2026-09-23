# Lucent

Local-first engine for narrated, animated explainer videos, designed to be written by AI agents first and people
second.

You write a short Markdown file: narration as paragraphs, with the words that trigger visuals in `[brackets]`, and one
small block of visual steps per scene. Lucent voices it locally, lays it out, animates the differences between
states, checks it for problems as text, and renders an mp4 with soft subtitle tracks.

> Status: research. No engine code yet. The design is in `docs/`, backed by measured spikes.

## Goals

Local first, fast, performant, and cheap for agents in time and tokens. Every budget is in
[`docs/goals.md`](docs/goals.md), for example:

| Budget | Target |
|---|---|
| Final render, 1080p30 | <= 0.25 s per video second (measured path: 0.07 to 0.16 s) |
| `check` after every edit | < 200 ms, never renders, never voices |
| One error message | <= 40 tokens, with a concrete fix |
| MCP tool definitions | <= 600 tokens (measured: 437) |

## What a video looks like

````markdown
## blood

These pale discs are [red blood cells]. Look for a purple dot inside them and you won't find one.
> es: Estos discos pálidos son glóbulos rojos. Buscá un punto violeta adentro y no vas a encontrar ninguno.

```scene
do:
  - photo: blood
    focus: wbc
    drift: slow
  - at: red blood cells
    ring: [$blood/rbc_1, $blood/rbc_2]
    label: no nucleus
```
````

No coordinates, no timestamps. Timing comes from the voice's word timings, layout from the engine, motion from
defaults.

## Architecture in one picture

```
video.lucent.md
  -> parse, validate, schedule, layout, check     TypeScript core      (`check` stops here)
  -> voice: sentences -> wav + word timings        Kokoro-82M, Python sidecar
  -> compile tracks -> draw SVG per frame          TypeScript components, pure functions of (state, time)
  -> rasterise                                     Skia (@napi-rs/canvas), worker threads
  -> encode scene segments, join, mux audio + subs ffmpeg (libx264), one continuous audio track
```

Agents use an MCP server with five tools (`lucent_guide`, `lucent_catalog`, `lucent_check`, `lucent_snap`,
`lucent_render`); people and CI use the `lucent` CLI. Both call the same core.

## Repository

| Path | What |
|---|---|
| [`docs/goals.md`](docs/goals.md) | Goals and budgets every decision is judged against |
| [`docs/adr/`](docs/adr/) | Architecture decision records |
| [`docs/spikes/`](docs/spikes/) | Research spikes: questions answered with sources and measurements |
| [`prototypes/manim/`](prototypes/manim/) | The Manim prototype that produced episode 1 of the Halden Genomics lessons; frozen reference and first customer |

## First customer

The Halden Genomics lessons: a 10-episode series on the biology and data behind a genetic diagnosis
(`prototypes/manim/SERIES.md`).

## License

MIT. See [LICENSE](LICENSE).
