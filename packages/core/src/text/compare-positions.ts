import type { Position } from "./types.ts";

export function comparePositions(a: Position, b: Position): number {
  return a.line - b.line || a.column - b.column;
}
