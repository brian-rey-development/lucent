# 0008. Ship authored, multi-language subtitles as soft tracks

- Status: Proposed (revised after spike 006)
- Date: 2026-09-23

## Context

Halden lessons are narrated in English with English and Spanish subtitles. In the prototype, burned-in Spanish
subtitles doubled with the player's own track and were rejected by the owner. The installed ffmpeg has no libass,
so burning in also needs extra tooling.

## Decision

Every narration paragraph is followed by one `> xx: ...` translation line per extra language (ADR 0002). Translations are
authored and reviewed with the script, not machine-translated at render time. Cue times come from the spoken
language's word timings, and every language's subtitle for a sentence uses that sentence's start and end. `render`
writes one SRT and one WebVTT sidecar per language (browsers and YouTube use sidecars) and muxes them into the mp4
as soft `mov_text` tracks tagged `eng`, `spa` and so on, the first language marked as default. Nothing is burned into
the frame.

## Consequences

- Viewers switch languages in the player, and the video frame stays clean.
- The default track is player-dependent: VLC-style players honour the default flag, but Apple's players (QuickTime,
  Safari) treat the default as forced-only and start with subtitles off until the viewer picks a language (spike 006).
- A translation that is much longer than its spoken sentence reads badly at speech speed; the validator warns
  (W4xx) when characters per second exceed a readable limit.
- A burned-in mode for social platforms can be added later as an option; it is not the default.
