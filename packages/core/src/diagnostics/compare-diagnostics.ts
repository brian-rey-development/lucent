import { comparePositions } from "../text/index.ts";
import type { Diagnostic } from "./types.ts";

export function compareDiagnostics(a: Diagnostic, b: Diagnostic): number {
  const byFile = (a.file ?? "").localeCompare(b.file ?? "");
  return byFile || comparePositions(a.position, b.position) || a.code.localeCompare(b.code);
}
