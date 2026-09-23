# Phase 0: Foundation, the format and `lucent check`

|            |                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| Status     | Complete                                                                                                                  |
| Date       | 2026-09-23                                                                                                                |
| Implements | ADR 0001 (TypeScript core), 0002 (Lucent Markdown), 0005 (cues), 0010 (CLI side), part of 0009 (rules that need no fonts) |

## Goal

An agent or a person writes a `*.lucent.md` file and gets, in milliseconds, every structural, schema, reference,
cue and speech problem as a short coded line with a location and a fix, plus an estimated timeline. Nothing is
voiced, laid out or rendered yet: those phases build on the document model this phase defines.

## Scope

In:

- pnpm workspace, TypeScript 7 strict, oxlint (type-aware), Prettier, Vitest, GitHub Actions CI.
- `@lucent/core`: parser for the Lucent Markdown subset with exact positions, frontmatter and scene-block
  validation, the verb catalog (spike components), element and point references across scenes (`keep`, `hide`),
  cue resolution with suggestions, speech rules, the asset manifest, an estimated timeline, coded diagnostics.
- `@lucent/cli` (`apps/cli`): `lucent check <file> [--scene <id>] [--json]` and `lucent catalog [<verb> [--schema]]`.
- `examples/halden-ep01/`: the `blood` and `molecule` scenes and their asset manifest, checked clean in CI.

Out: voice, layout and text measurement (W3xx), motion planning, rendering, MCP server, preview, `fix: true`.

## Design

`@lucent/core` is pure: it receives the file text and a port that reads files relative to it, and returns a report.
The CLI owns the filesystem, arguments and output. Core is organised in layered domain modules, from `text` up to
`check`, as described in `packages/core/README.md`.

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

One line each: `CODE [file:]line:column where message; fix: ...`. Errors fail `check` (exit 1); warnings do not.

| Range      | Class                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| E10x       | Files and YAML: missing frontmatter, syntax, unknown key, inline comment, invalid value, missing key |
| E11x       | Steps: more than one verb, no verb, modifier not allowed here                                        |
| E12x, E13x | Document structure: scenes, text outside scenes, scene blocks, fences, comments, translations, cues  |
| E14x       | Asset manifest (problems inside the manifest file reuse E10x, located in that file)                  |
| E2xx, W2xx | References: elements, points, assets, cues                                                           |
| W4xx       | Pacing: sentence groups too long for one breath of subtitles                                         |
| E5xx, W5xx | Speech: symbols the voice cannot read, digits                                                        |

`lucent catalog` lists every code with `--codes`.

## Acceptance criteria

- [x] `pnpm verify` (lint, format check, typecheck, tests with coverage, build) passes locally and in CI.
- [x] `lucent check examples/halden-ep01/ep01.lucent.md` reports no errors and prints the estimated timeline.
- [x] Every diagnostic code has a test that triggers it with the expected line and column.
- [x] A YAML value with ` #` inside a scene block is an error, never silently truncated.
- [x] `check` on a 300-line file takes well under 200 ms.
- [x] `lucent catalog` fits the 1,500-token budget; `lucent catalog <verb> --schema` prints that verb's JSON Schema.
- [x] One mistake produces exactly one diagnostic, for every code.
- [x] No `any`, no comments that restate code, functions short and named for what they do.

## Outcome

- 44 diagnostic codes. Each has a test in which one mistake produces exactly that one diagnostic, at an exact line and
  column. Invalid steps, blocks, frontmatter fields and manifest entries are kept as unknown instead of dropped, so
  nothing cascades into later steps or scenes.
- Every error line, including realistic malformed inputs, measures at most 29 tokens (`o200k_base`), inside the
  40-token budget after the 1.35 tokenizer margin. Messages state what was found; fixes say what to write.
- The catalog of 18 verbs measures about 480 tokens against a threshold of 1,111. `docs/format.md`, the guide agents
  read, fits the 1,200-token guide budget, and a test keeps it there.
- An inline ` #` comment is an error but no longer stops checking its block: only the value it cut goes unchecked.
- `check` confirms every asset file in the manifest exists, inside the video's folder.
- `check` on the example takes about 1 ms in process and 70 ms as a cold CLI run, Node startup included. Adversarial
  inputs (long lines, deep nesting, thousands of cues, aliases, 1 MB files) stay under 0.5 s, and output is capped.
- The CLI reads only regular UTF-8 files up to 1 MB, keeps the manifest inside the video's folder, escapes control
  characters, and separates exit codes for file errors, usage, unreadable input and internal failures.
- Layering is enforced by `test/architecture.test.ts` from one layer table per package: index-only imports, lower
  layers only, unknown modules rejected, no I/O in core.
