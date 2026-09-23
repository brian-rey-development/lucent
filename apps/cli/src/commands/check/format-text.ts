import { escapeControl, formatDiagnostic, type Report } from "@lucent/core";

import { MAX_DIAGNOSTICS, MAX_SCENES } from "./constants.ts";
import { formatSummary } from "./format-summary.ts";
import { formatTimeline } from "./format-timeline.ts";

export function formatText(file: string, report: Report): string {
  const shown = report.diagnostics.slice(0, MAX_DIAGNOSTICS);
  const omitted = report.diagnostics.length - shown.length;
  const more = omitted > 0 ? [`+${omitted} more; fix these and check again`] : [];
  const lines = [
    ...shown.map(formatDiagnostic),
    ...more,
    formatSummary(file, report),
    ...formatTimeline(report.timeline, MAX_SCENES),
  ];
  return lines.map(escapeControl).join("\n");
}
