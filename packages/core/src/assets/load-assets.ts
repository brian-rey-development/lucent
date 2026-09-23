import { createDiagnostic, type Result } from "../diagnostics/index.ts";
import type { Assets, AssetsSource, ReadFile } from "../model/index.ts";
import { stripByteOrderMark } from "../text/index.ts";
import { isRecord, readYaml, validateValue } from "../validation/index.ts";
import { SOURCE_WHERE, WHERE } from "./constants.ts";
import { manifestOf } from "./manifest-of.ts";
import { unreadable } from "./problems.ts";
import { manifestSchema } from "./schema.ts";

const UNAVAILABLE: Assets = Object.freeze({ status: "unavailable" });

export async function loadAssets(source: AssetsSource, readFile: ReadFile): Promise<Result<Assets>> {
  if (source.kind === "none") return { value: { status: "none" }, diagnostics: [] };
  if (source.kind === "invalid") return { value: UNAVAILABLE, diagnostics: [] };
  const read = await readFile(source.path);
  if (!read.ok) {
    const diagnostic = createDiagnostic(unreadable(source.path, read.reason), {
      where: SOURCE_WHERE,
      position: source.position,
    });
    return { value: UNAVAILABLE, diagnostics: [diagnostic] };
  }
  return parseManifest(read.text, source.path);
}

function parseManifest(text: string, file: string): Result<Assets> {
  const place = { where: WHERE, file };
  const read = readYaml({ text: stripByteOrderMark(text), firstLine: 1 }, place);
  if (read.value === undefined) return { value: UNAVAILABLE, diagnostics: read.diagnostics };
  const values = read.value.value ?? {};
  const { diagnostics } = validateValue(manifestSchema, values, { locate: read.value.locate, path: [], place });
  return { value: isRecord(values) ? manifestOf(values) : UNAVAILABLE, diagnostics };
}
