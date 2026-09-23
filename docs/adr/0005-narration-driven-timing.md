# 0005. Let narration drive time through cue phrases

- Status: Proposed (revised after spike 003)
- Date: 2026-09-23

## Context

In the Manim prototype, visuals waited for `n.wait_for_line(2, fraction=0.35)`: a line index and a guessed fraction
of its duration. Every rewrite of a sentence silently moved the visual away from the word it illustrated.

## Options

| Option                                        | Problem                                               |
| --------------------------------------------- | ----------------------------------------------------- |
| Absolute timestamps                           | Break on every edit; agents cannot know audio lengths |
| Line index plus fraction (prototype)          | Breaks when a sentence changes length or order        |
| Estimated reading speed                       | Drifts from real speech by seconds over a scene       |
| **Cue phrases resolved against word timings** | Needs a voice engine with timings (ADR 0004)          |

## Decision

Authors mark a phrase in the English narration with brackets, `These pale discs are [red blood cells].`, and a step
says `at: red blood cells`. The scheduler finds the phrase in the word timings and starts the step at its first
word. Steps without `at` follow the previous step. Scene length is the later of the narration end plus a tail and the
last animation end plus a dwell.

## Consequences

- Rewriting a sentence keeps each visual on its word, as long as the bracketed phrase survives the edit.
- Cues match word tokens and ignore punctuation. A cue that is missing from the narration is error E204, with the
  closest phrase as the suggested fix. A cue inside a number written in digits is error E205 ("spell it out"): the
  voice's timings for digit strings are unreliable (one 497 ms outlier in spike 003).
- Cues exist only in the timing language (English). Other languages are subtitles (ADR 0008).
- Accuracy target: a cue fires within 150 ms of the word in the audio. Measured against whisper over 110 words: 33 ms
  median, 125 ms at p90 (spike 003).
