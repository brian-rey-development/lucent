import { createDiagnostic, formatWhere, type Diagnostic } from "../diagnostics/index.ts";
import type { FileAccess } from "../model/index.ts";
import { textSchema } from "../catalog/index.ts";
import { isRecord } from "../validation/index.ts";
import type { Locator } from "../yaml/index.ts";
import { WHERE } from "./constants.ts";
import { missingFile } from "./problems.ts";

interface Manifest {
  readonly path: string;
  readonly values: Readonly<Record<string, unknown>>;
  readonly locate: Locator;
}

export async function findAssetFiles(
  { path, values, locate }: Manifest,
  { findFile }: FileAccess,
): Promise<readonly Diagnostic[]> {
  const folder = path.slice(0, path.lastIndexOf("/") + 1);
  const files = Object.entries(values).flatMap(([key, entry]) => {
    const file = textSchema.safeParse(isRecord(entry) ? entry["file"] : undefined);
    return file.success ? [{ key, file: file.data }] : [];
  });
  const found = await Promise.all(files.map(async ({ file }) => findFile(folder + file)));
  return files.flatMap(({ key, file }, index) => {
    const result = found[index];
    if (result === undefined || result.ok) return [];
    const where = formatWhere(WHERE, [key, "file"]);
    const position = locate.value([key, "file"]);
    return [createDiagnostic(missingFile(file, result.reason), { where, file: path, position })];
  });
}
