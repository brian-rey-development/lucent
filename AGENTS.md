# Lucent

Local-first engine for narrated explainer videos, written by agents first. Research phase: no engine code yet.

## Where things are

- `docs/goals.md`: budgets (render speed, `check` latency, token costs). Judge every proposal against them.
- `docs/adr/`: decisions. Proposed until the spikes agree; a changed decision gets a new record or an explicit revision note.
- `docs/spikes/`: research documents, not prototypes. Template in `docs/spikes/README.md`. Mark every number measured or estimated; throwaway experiment code stays out of the repo.
- `prototypes/manim/`: frozen Manim prototype (separate uv project). Reference for quality, not for code.

## Conventions

- Writing: no em dashes, no emojis, headings without trailing colons.
- Package managers: pnpm for TypeScript, uv for Python.
- Conventional commits in English.
