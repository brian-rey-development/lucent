import type { VerbDefinition } from "../catalog/index.ts";
import type { DeclaredElement } from "../model/index.ts";
import type { Raw } from "./types.ts";

export function declareElement(
  raw: Raw,
  verb: VerbDefinition,
  key = verb.name,
): DeclaredElement | undefined {
  if (verb.element === "none") return undefined;
  const main = raw[key];
  const asset = verb.element === "asset" && typeof main === "string" ? main : undefined;
  const id = raw["id"];
  const explicit = typeof id === "string";
  return { id: explicit ? id : (asset ?? verb.name), verb, asset, explicit };
}
