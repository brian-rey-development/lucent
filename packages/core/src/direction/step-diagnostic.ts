import {
  createDiagnostic,
  formatWhere,
  type Diagnostic,
  type Problem,
} from "../diagnostics/index.ts";
import type { StepCursor } from "./types.ts";

export function stepDiagnostic(
  problem: Problem,
  { place, path, locate }: StepCursor,
  key?: string,
): Diagnostic {
  const position = key === undefined ? locate.value(path) : locate.key([...path, key]);
  return createDiagnostic(problem, { ...place, where: formatWhere(place.where, path), position });
}
