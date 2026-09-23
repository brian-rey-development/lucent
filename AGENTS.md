# Lucent

Local-first engine for narrated explainer videos, written by agents first. Phase 0 (the format, `lucent check`,
`lucent catalog`) is complete; the roadmap is in `README.md`.

## Commands

- `pnpm verify`: lint, format check, typecheck, tests with coverage, build. What CI runs.
- `pnpm exec vitest run <path>`: targeted tests.
- `pnpm build && pnpm -s lucent check <file>`: run the CLI.

## Where things are

- `CONTRIBUTING.md`: code rules, module anatomy and test rules. Follow them.
- `packages/core`: the engine, with no I/O. `apps/cli`: the `lucent` command. Each README has its layer table.
- `docs/format.md`: the Lucent Markdown reference.
- `docs/goals.md`: budgets (render speed, `check` latency, token costs). Judge every proposal against them.
- `docs/adr/`: decisions. A changed decision gets a new record or an explicit revision note.
- `docs/spikes/`: research documents, not prototypes. Mark every number measured or estimated.
- `docs/plans/`: one implementation plan per phase.
- `prototypes/manim/`: frozen Manim prototype. Reference for quality, not for code.

## Conventions

- Writing: no em dashes, no emojis, headings without trailing colons.
- Package managers: pnpm for TypeScript, uv for Python.
- Conventional commits in English.
