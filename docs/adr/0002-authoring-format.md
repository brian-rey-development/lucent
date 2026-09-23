# 0002. Author videos in Lucent Markdown: prose paragraphs plus one YAML block per scene

- Status: Proposed (revised after spike 001)
- Date: 2026-09-23

## Context

The main author is an AI agent; the second is a person reviewing and translating narration. The file must be cheap
to write, fail rarely on the first attempt, be checkable without running anything, and locate every error by line.

Spike 001 measured, on two real scenes of episode 1:

- Narration (English plus Spanish) is 633 tokens and cannot be compressed. Visual direction costs 1,379 tokens in the
  Manim prototype and 220 to 414 tokens in the declarative candidates.
- **Plain YAML breaks on 11% of real narration lines** (colons in Spanish prose), and a ` #` inside prose is silently
  dropped as a comment.

The first version of this record chose a single YAML file. The spike found that YAML is a good fit for direction and
a poor fit for prose.

## Options

| Option | Overhead tokens | Main problem |
|---|---|---|
| Plain YAML | 398 | Prose breaks parsing, one case silently |
| YAML with all prose quoted | 414 | Noisy to read and review; relies on a formatter |
| **Markdown prose + one YAML block per scene** | **338** | Cue phrases are written twice (in prose and in `at:`) |
| Markdown with inline directives | 220 | Structure collapses into attribute strings, a private mini-language |
| Code (TSX, as Remotion and Motion Canvas) | Highest | Not statically checkable, executes agent-written code |

## Decision

A video is one `*.lucent.md` file:

- YAML frontmatter for video settings.
- `## scene-id` starts a scene.
- Each paragraph is one spoken sentence group, the unit of voice caching; `[phrase]` marks a cue.
- `> es: ...` after a paragraph is its translation, one line per extra subtitle language.
- One fenced ` ```scene ` block per scene holds `keep`, `enter`, `layout` and the `do` list of steps, parsed as YAML
  1.2.

Unknown keys are errors, each step has exactly one verb key, and inline comments inside scene blocks are errors, so
YAML can never drop text silently. The format is data, never code; power beyond the catalog comes from project
components (ADR 0006). The file stays valid Markdown.

## Consequences

- Narration has no quoting rules at all, and reads, reviews and translates as a script.
- Direction keeps YAML's structure, so steps validate against the catalog schema with exact line numbers.
- We own a small line-based splitter for the Markdown subset (headings, paragraphs, `>` lines, one fence type)
  instead of depending on a general Markdown parser.
- Cue phrases appear twice. A mismatch is error E204 with the closest phrase as the fix.

Revisit if the fresh-agent test (spike 007) shows agents often mismatch cues. The alternative is inline cue actions
for simple steps only.
