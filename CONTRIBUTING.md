# Contributing

## Setup

Requires Node 24 (`.nvmrc`) and pnpm (`packageManager` in `package.json`, via Corepack).

```sh
pnpm install
pnpm verify
```

`pnpm verify` runs what CI runs: lint (type-aware), format check, typecheck, tests with coverage and the build.

| Command | Purpose |
|---|---|
| `pnpm test` | Run the tests |
| `pnpm exec vitest run <path>` | Run some tests |
| `pnpm format` | Format everything |
| `pnpm build && pnpm -s lucent check <file>` | Run the CLI |

Development and tests read TypeScript sources directly: each package exports its `src/` under the `@lucent/source`
condition, which `tsconfig.json` and `vitest.config.ts` enable. Only the build and the published package use `dist/`.

## Code

- `packages/` are libraries, `apps/` are entry points. `packages/core` does no I/O: no Node modules, no `process`.
- `src/` holds only `index.ts` and modules. Every module has the same anatomy:

  ```
  <module>/
  ├── index.ts          public API, the only import path from outside the module
  ├── types.ts          shared types
  ├── constants.ts      named constants and data tables
  ├── schema.ts         zod schemas
  ├── problems.ts       the module's diagnostic messages
  ├── errors.ts         error classes
  └── <operation>.ts    one exported function, named after the file
  ```

  Support files exist only when needed. A type or constant used by one file stays in that file.
- Modules import only through another module's `index.ts`, and only from a lower layer. The layers are in
  [`packages/core/README.md`](packages/core/README.md) and [`apps/cli/README.md`](apps/cli/README.md);
  `test/architecture.test.ts` enforces them, and a new module fails until it has a layer.
- TypeScript strict, no `any`, no type assertions, functions of at most 20 lines. Relative imports use the `.ts`
  extension. Comments explain a non-obvious why, never what.
- A diagnostic says what was found and how to fix it, in one line within the token budget. Quote free text, leave
  identifiers bare, and use YAML words: mapping, list, text, true or false.

## Tests

- Tests mirror `src/`, one file per exported function, and go through module indexes.
- Every diagnostic code has a case in `packages/core/test/support/cases.ts` that must produce exactly that one
  diagnostic at its line and column: one mistake, one diagnostic.
- `packages/core/test/check/budgets.test.ts` holds the token and latency budgets from [`docs/goals.md`](docs/goals.md).

## Decisions

Significant design changes start as an ADR in [`docs/adr/`](docs/adr/), judged against the budgets in
[`docs/goals.md`](docs/goals.md). Open questions that need evidence start as a spike in [`docs/spikes/`](docs/spikes/).

## Pull requests

- One topic per pull request, with tests.
- [Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`,
  `chore:`.
- `pnpm verify` passes.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
