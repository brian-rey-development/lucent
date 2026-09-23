import type { Report } from "@lucent/core";

import { formatClock } from "./format-clock.ts";

export function formatSummary(file: string, { errors, warnings, timeline }: Report): string {
  return `${file}: ${pluralize(errors, "error")}, ${pluralize(warnings, "warning")}, ~${formatClock(timeline.duration)} estimated`;
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
