import { createDiagnostic, type Result } from "../diagnostics/index.ts";
import type { Settings } from "../model/index.ts";
import { isRecord, readYaml, validateValue } from "../validation/index.ts";
import { WHERE } from "./constants.ts";
import { MISSING, UNCLOSED } from "./problems.ts";
import { frontmatterSchema } from "./schema.ts";
import { settingsOf } from "./settings-of.ts";
import type { FrontmatterSplit } from "./types.ts";

const UNKNOWN: Settings = Object.freeze({
  subtitles: undefined,
  colors: undefined,
  assets: Object.freeze({ kind: "invalid" }),
});
const PLACE = { where: WHERE } as const;

export function parseFrontmatter(split: FrontmatterSplit): Result<Settings> {
  if (split.kind !== "found") return notFound(split);
  const read = readYaml(split.block, PLACE);
  if (read.value === undefined) return { value: UNKNOWN, diagnostics: read.diagnostics };
  const { locate } = read.value;
  const values = read.value.value ?? {};
  const validated = validateValue(frontmatterSchema, values, { locate, path: [], place: PLACE });
  return {
    value: isRecord(values) ? settingsOf(values, locate) : UNKNOWN,
    diagnostics: [...read.diagnostics, ...validated.diagnostics],
  };
}

function notFound({ kind, line }: Exclude<FrontmatterSplit, { kind: "found" }>): Result<Settings> {
  const problem = kind === "missing" ? MISSING : UNCLOSED;
  const position = { line, column: 1 };
  return { value: UNKNOWN, diagnostics: [createDiagnostic(problem, { ...PLACE, position })] };
}
