# Architecture decision records

Every record is judged against `docs/goals.md`: local first, fast, performant, cheap for agents.

One file per decision, numbered, never renumbered. A decision that changes is superseded by a new record, not
edited in place (fix typos freely).

| #                                           | Decision                                                        | Status   |
| ------------------------------------------- | --------------------------------------------------------------- | -------- |
| [0001](0001-core-language.md)               | TypeScript core, Python only as a voice sidecar                 | Proposed |
| [0002](0002-authoring-format.md)            | Lucent Markdown: prose paragraphs plus one YAML block per scene | Proposed |
| [0003](0003-renderer.md)                    | Components emit an SVG display list, rasterised by Skia         | Proposed |
| [0004](0004-voice-sidecar.md)               | Kokoro in a Python sidecar with a file contract                 | Proposed |
| [0005](0005-narration-driven-timing.md)     | Narration drives time through word-level cues                   | Proposed |
| [0006](0006-component-contract.md)          | Components are pure functions of props and time                 | Proposed |
| [0007](0007-scene-segment-cache.md)         | Scenes are the unit of caching and parallel rendering           | Proposed |
| [0008](0008-soft-subtitle-tracks.md)        | Authored, multi-language, soft subtitle tracks                  | Proposed |
| [0009](0009-engine-owned-layout.md)         | The engine computes layout at compile time                      | Proposed |
| [0010](0010-agent-interface.md)             | One core library, two thin interfaces: an MCP server and a CLI  | Proposed |
| [0011](0011-motion-defaults.md)             | Motion comes from defaults and pacing rules, not from authors   | Proposed |
| [0012](0012-formatter-safe-translations.md) | A blank line may separate a paragraph from its translations     | Accepted |

All records are **Proposed** until the research spikes in `docs/spikes/` report. The spike findings
moves each one to Accepted or Rejected.

## Template

```markdown
# NNNN. Title in the imperative

- Status: Proposed | Accepted | Rejected | Superseded by NNNN
- Date: YYYY-MM-DD

## Context
What forces are at play, and what is true today (measured where possible).

## Options
The real alternatives, each with its strongest argument.

## Decision
What we do, in one paragraph.

## Consequences
What becomes easier, what becomes harder, and what would make us revisit this.
```
