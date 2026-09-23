# @lucent/cli

The `lucent` command. It owns argv, the filesystem, output and exit codes, and delegates the rest to `@lucent/core`.

```
lucent check <file> [--scene <id>] [--json]   check a .lucent.md file and estimate its timeline
lucent catalog [<verb> [--schema]]            list the verbs, or show one verb or its JSON Schema
lucent catalog --codes                        list every diagnostic code
lucent --help | --version
```

| Exit code | Meaning                                       |
| --------- | --------------------------------------------- |
| 0         | No errors; warnings allowed                   |
| 1         | The file has errors                           |
| 2         | Bad usage, such as an unknown option or scene |
| 3         | The file cannot be read                       |
| 70        | Internal error                                |

Text output shows at most 50 diagnostics and 50 scenes, and escapes control characters. `--json` prints one object:
`{ file, ok, errors, warnings, diagnostics, omitted, timeline }`, where `omitted` counts diagnostics beyond the first 50. Usage and read errors print `{ ok: false, error }` instead.

The manifest named by `assets:` must be a regular file of at most 1 MB inside the video's folder. Diagnostics for it
show its path relative to the working directory.

## Layers

| Layer | Module                                 | Role                                                |
| ----- | -------------------------------------- | --------------------------------------------------- |
| 3     | `main.ts`                              | Process entry, the only file that touches `process` |
| 2     | `program/`                             | Parses argv into a command and dispatches it        |
| 1     | `commands/check/`, `commands/catalog/` | One module per command                              |
| 0     | `shared/`                              | `Io`, exit codes, errors and file reading           |
