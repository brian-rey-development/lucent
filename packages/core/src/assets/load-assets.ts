import { createDiagnostic, type Result } from "../diagnostics/index.ts";
import type { Assets, AssetsSource, FileAccess } from "../model/index.ts";
import { stripByteOrderMark } from "../text/index.ts";
import { isRecord, readYaml, validateValue } from "../validation/index.ts";
import { SOURCE_WHERE, WHERE } from "./constants.ts";
import { findAssetFiles } from "./find-asset-files.ts";
import { manifestOf } from "./manifest-of.ts";
import { unreadable } from "./problems.ts";
import { manifestSchema } from "./schema.ts";

const UNAVAILABLE: Assets = Object.freeze({ status: "unavailable" });

export async function loadAssets(source: AssetsSource, files: FileAccess): Promise<Result<Assets>> {
  if (source.kind === "none") return { value: { status: "none" }, diagnostics: [] };
  if (source.kind === "invalid") return { value: UNAVAILABLE, diagnostics: [] };
  const read = await files.readFile(source.path);
  if (read.ok) return parseManifest(read.text, source.path, files);
  const diagnostic = createDiagnostic(unreadable(source.path, read.reason), {
    where: SOURCE_WHERE,
    position: source.position,
  });
  return { value: UNAVAILABLE, diagnostics: [diagnostic] };
}

async function parseManifest(
  text: string,
  path: string,
  files: FileAccess,
): Promise<Result<Assets>> {
  const place = { where: WHERE, file: path };
  const read = readYaml({ text: stripByteOrderMark(text), firstLine: 1 }, place);
  if (read.value === undefined) return { value: UNAVAILABLE, diagnostics: read.diagnostics };
  const { locate } = read.value;
  const values = read.value.value ?? {};
  const validated = validateValue(manifestSchema, values, { locate, path: [], place });
  if (!isRecord(values))
    return { value: UNAVAILABLE, diagnostics: [...read.diagnostics, ...validated.diagnostics] };
  const missing = await findAssetFiles({ path, values, locate }, files);
  return {
    value: manifestOf(values),
    diagnostics: [...read.diagnostics, ...validated.diagnostics, ...missing],
  };
}
