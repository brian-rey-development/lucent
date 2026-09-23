import { ERRNO_REASONS } from "./constants.ts";

export function reasonOf(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const code = "code" in error && typeof error.code === "string" ? error.code : undefined;
  return (code === undefined ? undefined : ERRNO_REASONS[code]) ?? code ?? error.message;
}
