import type { Report } from "@lucent/core";

import { MAX_DIAGNOSTICS } from "./constants.ts";

export function formatJson(file: string, report: Report): string {
  const diagnostics = report.diagnostics.slice(0, MAX_DIAGNOSTICS);
  return JSON.stringify({
    file,
    ...report,
    diagnostics,
    omitted: report.diagnostics.length - diagnostics.length,
  });
}
