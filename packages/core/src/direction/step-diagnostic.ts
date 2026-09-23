import { createDiagnostic, formatWhere, type Diagnostic, type Problem } from "../diagnostics/index.ts";
import type { Position } from "../text/index.ts";
import type { StepCursor } from "./types.ts";

export function stepDiagnostic(problem: Problem, { place, path }: StepCursor, position: Position): Diagnostic {
  return createDiagnostic(problem, { ...place, where: formatWhere(place.where, path), position });
}
