import { VERBS } from "./constants.ts";
import type { VerbDefinition } from "./types.ts";

const BY_NAME: ReadonlyMap<string, VerbDefinition> = new Map(
  VERBS.map((verb) => [verb.name, verb]),
);

export function findVerb(name: string): VerbDefinition | undefined {
  return BY_NAME.get(name);
}
