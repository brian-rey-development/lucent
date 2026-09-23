import { escapeControl } from "./escape-control.ts";
import type { Diagnostic } from "./types.ts";

export function formatDiagnostic({ code, file, position, where, message, fix }: Diagnostic): string {
  const location = `${file === undefined ? "" : `${file}:`}${position.line}:${position.column}`;
  return escapeControl(`${code} ${location} ${where} ${message}; fix: ${fix}`);
}
