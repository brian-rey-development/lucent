import { findVerb } from "../catalog/index.ts";
import { ELEMENT_SIGIL } from "../text/index.ts";

export function findVerbKeys(keys: readonly string[]): readonly string[] {
  return keys.filter((key) => key.startsWith(ELEMENT_SIGIL) || findVerb(key) !== undefined);
}
