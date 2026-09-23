import { DIAGNOSTIC_CODES, MAX_TEXT_LENGTH } from "./constants.ts";
import { truncate } from "./truncate.ts";
import type { Diagnostic, Location, Problem } from "./types.ts";

export function createDiagnostic({ code, message, fix }: Problem, location: Location): Diagnostic {
  return {
    code,
    message: truncate(message, MAX_TEXT_LENGTH),
    fix: truncate(fix, MAX_TEXT_LENGTH),
    ...location,
    where: truncate(location.where, MAX_TEXT_LENGTH),
    severity: DIAGNOSTIC_CODES[code].severity,
  };
}
