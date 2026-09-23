import { compareDiagnostics, isError, type Diagnostic } from "../diagnostics/index.ts";
import type { Timeline } from "../timeline/index.ts";
import type { Report } from "./types.ts";

export function createReport(diagnostics: readonly Diagnostic[], timeline: Timeline): Report {
  const errors = diagnostics.filter(isError).length;
  return {
    ok: errors === 0,
    errors,
    warnings: diagnostics.length - errors,
    diagnostics: diagnostics.toSorted(compareDiagnostics),
    timeline,
  };
}
