import { isModifier } from "../catalog/index.ts";
import type { Raw } from "./types.ts";

export function findMisplaced(raw: Raw, shape: object): readonly string[] {
  return Object.keys(raw).filter((key) => isModifier(key) && !Object.hasOwn(shape, key));
}
