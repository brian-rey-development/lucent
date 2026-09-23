import { DIAGNOSTIC_CODES } from "@lucent/core";

export function formatCodes(): string {
  return Object.entries(DIAGNOSTIC_CODES)
    .map(([code, { summary }]) => `${code} ${summary}`)
    .join("\n");
}
