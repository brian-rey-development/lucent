import type { Diagnostic } from "./types.ts";

export function isError({ severity }: Diagnostic): boolean {
  return severity === "error";
}
