import { dirname, relative, resolve } from "node:path";

import { check, selectScene, type Diagnostic, type Report } from "@lucent/core";

import { CliError, EXIT_CODES, InputError, type ExitCode, type Io } from "../../shared/index.ts";
import { formatJson } from "./format-json.ts";
import { formatText } from "./format-text.ts";
import type { CheckArgs } from "./types.ts";

export async function runCheck({ file, json, scene }: CheckArgs, io: Io): Promise<ExitCode> {
  const path = resolve(io.cwd, file);
  const folder = dirname(path);
  const source = await io.readFile(path);
  if (!source.ok) throw new InputError(`cannot read ${file}: ${source.reason}`);
  const full = await check(source.text, { readFile: async (asset) => io.readFile(resolve(folder, asset), folder) });
  const report = relativeFiles(scene === undefined ? full : selected(full, scene), folder, io.cwd);
  io.stdout(json ? formatJson(file, report) : formatText(file, report));
  return report.ok ? EXIT_CODES.ok : EXIT_CODES.failed;
}

function selected(report: Report, scene: string): Report {
  const ids = report.timeline.scenes.map(({ id }) => id);
  if (ids.length === 0) throw new CliError("the file has no scenes");
  const found = selectScene(report, scene);
  if (found === undefined) throw new CliError(`no scene ${scene}; scenes: ${ids.join(", ")}`);
  return found;
}

function relativeFiles(report: Report, folder: string, cwd: string): Report {
  const diagnostics = report.diagnostics.map((diagnostic): Diagnostic => {
    if (diagnostic.file === undefined) return diagnostic;
    return { ...diagnostic, file: relative(cwd, resolve(folder, diagnostic.file)) };
  });
  return { ...report, diagnostics };
}
