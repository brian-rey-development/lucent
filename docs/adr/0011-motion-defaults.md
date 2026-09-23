# 0011. Motion comes from defaults and pacing rules, not from authors

- Status: Proposed
- Date: 2026-09-23

## Context

"Declare states, not transitions" (ADR 0002, 0006) only produces good video if the engine chooses the motion well.
Spike 005 surveyed FLIP, Framer Motion, Keynote Magic Move, Manim's transforms, Motion Canvas and the View
Transitions API, and the learning research (Mayer's multimedia principles; Tversky, Morrison and Betrancourt 2002).
All working systems reduce to "match, then interpolate", and animation helps learning only when it is slow, sparse and
congruent with the narration.

## Decision

- Motion is compiled into per-element tracks that are pure functions of absolute time. Moves use a critically damped
  spring in closed form, `x = 1 - (1 + w t) e^(-w t)` with `w = 6.64 / duration`, so no frame depends on the previous
  one.
- Durations grow with travel distance, sub-linearly: `clamp(0.35 + 0.55 * sqrt(distance / diagonal), 0.35, 1.2)` s.
- The default rules (entrances, exits, re-layout, text and tile morphs, zoom-through with a log-scale camera and a
  handoff at 3x, continuous motion with 0.5 s ramps, 80 ms stagger, at most 3 concurrent motion groups, 0.8 s dwell)
  are the table in spike 005, section 5.4. Every value is a theme token.
- Pacing and pedagogy are checked, not hoped for: W410 to W415 (concurrency, dwell, temporal contiguity with
  narration, segmenting, redundancy between on-screen text and speech, signaling).

## Consequences

- Authors and agents write no easing, durations or keyframes. The source stays short and the motion stays consistent
  across every video.
- Changing the feel of a whole series is a theme change, not an edit to every scene.
- Some motions an author wants will not match the defaults. The override is a per-step `dur:` or `enter:`
  modifier; anything more is a sign the default table needs a new rule.
