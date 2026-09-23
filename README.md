# Lucent

[![CI](https://github.com/brian-rey-development/lucent/actions/workflows/ci.yml/badge.svg)](https://github.com/brian-rey-development/lucent/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A524-339933.svg)](.nvmrc)

Narrated explainer videos from a Markdown file. Local first, and designed for AI agents to write.

You write what is said and what is on screen. Lucent owns timing, layout, motion, voice and subtitles, and checks the
file as text in milliseconds, so an agent fixes mistakes from a one-line error instead of a rendered frame.

> **Status:** phase 0, the foundation, is done: the format, `lucent check` and `lucent catalog` work today. Voice and
> rendering come next; see the [roadmap](#roadmap).

## A video is one file

````markdown
---
lucent: 0
title: Where the instructions live
voice: kokoro/am_fenrir
subtitles: [en, es]
assets: assets/images.yaml
---

## blood

These pale discs are [red blood cells]. Look for a purple dot inside them and you won't find one.
> es: Estos discos pálidos son glóbulos rojos. Buscá un punto violeta adentro y no vas a encontrar ninguno.

```scene
do:
  - photo: blood
    center: wbc
  - at: red blood cells
    ring: [$blood/rbc_1, $blood/rbc_2]
    label: no nucleus
```
````

- Each paragraph is spoken; `[red blood cells]` marks a cue.
- `at: red blood cells` starts the step when that phrase is spoken.
- `$blood/rbc_1` is a named point on the photo, defined once in the asset manifest.

Coordinates, timestamps and easing stay out of the file. The full reference is [`docs/format.md`](docs/format.md).

## Quickstart

Requires Node 24 and pnpm.

```sh
git clone https://github.com/brian-rey-development/lucent.git
cd lucent
pnpm install
pnpm build
pnpm -s lucent check examples/halden-ep01/ep01.lucent.md
```

```text
examples/halden-ep01/ep01.lucent.md: 0 errors, 0 warnings, ~1:35 estimated
blood     ~0:00  50.4s  "red blood cells" +8.9s; "thirty trillion" +26.6s; "white blood cell" +45.4s
molecule  ~0:50  45.0s  "Zoom in" +8.9s; "two millionths" +18.5s; "bases" +25.4s; "order of those letters" +33.1s
```

Each scene line shows its start, its length and when each cue is spoken, counted from the scene start. Each problem is
one line with a code, a position and a fix:

```text
E501 18:93 blood "%" cannot be spoken; fix: write "percent"
E204 29:9 blood.do[1].at cue "red blod cells" is not marked; fix: use "red blood cells"
E201 30:12 blood.do[1].ring[0] blood has no point rbc3; fix: use rbc_1
```

`pnpm -s` keeps pnpm's own banner out of the output. `pnpm link --global` in `apps/cli` puts `lucent` on your path.

## Commands

| Command                                                        | Output                                      |
| -------------------------------------------------------------- | ------------------------------------------- |
| `lucent check <file> [--scene <id>] [--json]`                  | Diagnostics and the estimated timeline      |
| `lucent catalog`                                               | Every verb, one line each, about 500 tokens |
| `lucent catalog <verb> [--schema]`                             | One verb, or its JSON Schema                |
| `lucent catalog --codes`                                       | Every diagnostic code                       |
| `lucent --help`, `lucent <command> --help`, `lucent --version` | Help and version                            |

`check` exits 0 when the file has no errors (warnings allowed), 1 when it has errors, 2 on bad usage, 3 when the file
cannot be read, and 70 on an internal error.

## Design

| Goal             | Budget                                 | Approach                                                                      |
| ---------------- | -------------------------------------- | ----------------------------------------------------------------------------- |
| Cheap for agents | Catalog ≤ 1,500 tokens, one error ≤ 40 | One-line catalog and errors, counted in CI with `o200k_base`                  |
| Fast feedback    | `check` < 200 ms                       | Text checks first, pixels last. About 70 ms for a cold CLI run on the example |
| Fast render      | ≤ 0.25 s per video second at 1080p30   | SVG display list rasterised by Skia, cached per scene                         |
| Local first      | No account, no network after install   | Kokoro-82M voice in a local sidecar, ffmpeg                                   |

Budgets live in [`docs/goals.md`](docs/goals.md), decisions in [`docs/adr/`](docs/adr/), and the measurements behind
them in [`docs/spikes/`](docs/spikes/).

## Roadmap

| Phase         | Scope                                                            | Status  |
| ------------- | ---------------------------------------------------------------- | ------- |
| 0. Foundation | Format, `check`, catalog, estimated timeline                     | Done    |
| 1. Voice      | Kokoro-82M sidecar, word timings, exact cue times                | Next    |
| 2. Render     | Layout, motion, Skia rasteriser, ffmpeg segments, soft subtitles | Planned |
| 3. Agents     | MCP server, contact sheets, shared background process            | Planned |

## Repository

| Path                                   | Contents                                     |
| -------------------------------------- | -------------------------------------------- |
| [`packages/core`](packages/core)       | The engine, free of I/O                      |
| [`apps/cli`](apps/cli)                 | The `lucent` command                         |
| [`examples/`](examples)                | Videos checked clean in CI                   |
| [`docs/`](docs)                        | Format reference, goals, ADRs, spikes, plans |
| [`prototypes/manim`](prototypes/manim) | The frozen Manim prototype Lucent replaces   |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Report vulnerabilities as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
