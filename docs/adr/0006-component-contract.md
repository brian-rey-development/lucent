# 0006. Make components pure functions of props and time

- Status: Proposed (revised after spike 005)
- Date: 2026-09-23

## Context

Components are the part of Lucent that grows: built-ins, domain components (Punnett square, pileup) and project
components written by agents. They need to be validated like the rest of the file, rendered in any order and in
parallel, and survive a change of renderer (ADR 0003).

## Decision

A component is a module that exports:

1. A zod schema for its props. The one-line catalog and the on-demand JSON Schema (ADR 0010) are generated from it.
2. A render function of `(state, time)` that returns the SVG subset defined in ADR 0003, never HTML. `state` is the
   compiled snapshot: its props now, its previous props and when the change started, so the component can animate
   the difference ("declare states, not transitions").

Each prop in the schema declares how it interpolates (`interp`: `lerp`, `color` in OKLab, `box`, `path`, `text`,
`discrete`). The engine interpolates, never the component: it passes interpolated props plus `u` (eased progress of
the current change), `match` (a precomputed text, path or tile plan) and `age` (seconds since the element appeared,
for continuous motion). See spike 005.

A component receives its box from the compiled layout (ADR 0009) and never measures anything itself. It keeps no
mutable animation state, performs no I/O and reads time and assets only through
`lucent/runtime`. Project components live in the project's `components/` folder and follow the same contract; the
validator checks their props like any built-in. A project component that a second project needs is promoted to the
catalog.

## Consequences

- Any frame can be rendered alone, which makes parallel rendering, contact sheets and single-scene re-renders
  possible.
- Components can be unit tested as functions: given state and time, assert on the output.
- Continuous motion (a turning helix, a photo drift) is written as a function of time, not as accumulated per-frame
  updates. This removes a class of Manim bugs such as updaters that only run during `wait`.
- Components cannot own complex physics or simulation state. If one ever needs it, it precomputes at compile time.
