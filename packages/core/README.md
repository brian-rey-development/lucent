# @lucent/core

The engine. It takes the text of a `.lucent.md` file and two functions, one that reads files relative to it and one
that confirms asset files exist, and returns a report: diagnostics plus the estimated timeline. It performs no I/O of
its own.

```ts
import { check, formatDiagnostic } from "@lucent/core";

const report = await check(source, {
  readFile: async (path) => ({ ok: true, text: await read(path) }),
  findFile: async (path) => (await exists(path) ? { ok: true } : { ok: false, reason: "no such file" }),
});
report.diagnostics.map(formatDiagnostic);
```

## Layers

A module imports only from lower layers, never from its own, and only through the other module's `index.ts`.
`test/architecture.test.ts` at the repository root enforces this.

| Layer | Modules                                                 | Role                                                    |
| ----- | ------------------------------------------------------- | ------------------------------------------------------- |
| 6     | `check`                                                 | Parses the file, runs every analysis, builds the report |
| 5     | `references`, `cues`, `speech`, `subtitles`, `timeline` | One analysis each, over the parsed video                |
| 4     | `frontmatter`, `scenes`, `direction`, `assets`          | Source text to the video model, with exact positions    |
| 3     | `model`                                                 | The video model: scenes, narration, steps, assets       |
| 2     | `catalog`, `validation`                                 | Verbs and their schemas; schema checks with diagnostics |
| 1     | `yaml`, `diagnostics`                                   | YAML with positions; diagnostic codes and formatting    |
| 0     | `text`                                                  | Lines, words, ids, phrase matching                      |

Module anatomy and code rules are in [`CONTRIBUTING.md`](../../CONTRIBUTING.md). `catalog/verbs/` holds one definition
per verb.

Tests mirror `src/` under `test/`. `test/check/codes.test.ts` triggers every diagnostic code alone at an exact line and
column, and `test/check/budgets.test.ts` holds the token and latency budgets from `docs/goals.md`.
