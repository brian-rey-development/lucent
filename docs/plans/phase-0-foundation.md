# Phase 0: Foundation, the format and `lucent check`

| | |
|---|---|
| Status | In progress |
| Date | 2026-09-23 |
| Implements | ADR 0001 (TypeScript core), 0002 (Lucent Markdown), 0005 (cues), 0010 (CLI side), part of 0009 (rules that need no fonts) |

## Goal

An agent or a person writes a `*.lucent.md` file and gets, in milliseconds, every structural, schema, reference,
cue and speech problem as a short coded line with a location and a fix, plus an estimated timeline. Nothing is
voiced, laid out or rendered yet: those phases build on the document model this phase defines.

## Scope

In:

- pnpm workspace, TypeScript strict, ESLint (type-aware), Prettier, Vitest, GitHub Actions CI.
- `@lucent/core`: parser for the Lucent Markdown subset with exact positions, frontmatter and scene-block
  validation, the verb catalog (spike components), element and point references across scenes (`keep`, `hide`),
  cue resolution with suggestions, speech rules, the asset manifest, an estimated timeline, coded diagnostics.
- `@lucent/cli`: `lucent check <file> [--scene id] [--json]` and `lucent catalog [verb] [--schema]`.
- `examples/halden-ep01/`: the `blood` and `molecule` scenes and their asset manifest, checked clean in CI.

Out: voice, layout and text measurement (W3xx), motion planning, rendering, MCP server, preview, `fix: true`.

## Design

`@lucent/core` is pure: it receives the file text and a port that reads files relative to it, and returns a report.
The CLI owns the filesystem, arguments and output.

```
source text
  -> document     split the Markdown subset: frontmatter, scenes, paragraphs, cues, translations, pauses, scene blocks
  -> yaml         parse frontmatter and scene blocks, keep a position for every node, reject inline comments
  -> schema       zod schemas for frontmatter, scene blocks, the asset manifest and every verb
  -> validate     structure, schema, references, cues, speech
  -> timeline     estimated scene and cue times (no voice yet)
  -> report       diagnostics sorted by position, timeline, ok flag
```

## Diagnostics

One line each: `CODE line:column where message; fix: ...`. Errors fail `check` (exit 1); warnings do not.

| Range | Class |
|---|---|
| E10x | Files and YAML: missing frontmatter, syntax, unknown key, inline comment, invalid value, missing key |
| E11x | Steps: more than one verb, no verb, modifier not allowed here |
| E12x, E13x | Document structure: scene ids, text outside scenes, scene blocks, fences, translations, cues |
| E14x | Asset manifest |
| E2xx, W2xx | References: elements, points, assets, cues |
| W4xx | Pacing: sentence groups too long for one breath of subtitles |
| E5xx, W5xx | Speech: symbols the voice cannot read, digits |

`lucent catalog` lists every code with `--codes`.

## Acceptance criteria

- [ ] `pnpm verify` (lint, format check, typecheck, tests with coverage, build) passes locally and in CI.
- [ ] `lucent check examples/halden-ep01/ep01.lucent.md` reports no errors and prints the estimated timeline.
- [ ] Every diagnostic code has a test that triggers it with the expected line and column.
- [ ] A YAML value with ` #` inside a scene block is an error, never silently truncated.
- [ ] `check` on a 300-line file takes well under 200 ms.
- [ ] `lucent catalog` fits the 1,500-token budget; `--schema <verb>` prints that verb's JSON Schema.
- [ ] No `any`, no comments that restate code, functions short and named for what they do.
