import type { VerbDefinition } from "./types.ts";

export function formatVerb({ signature, summary, change }: VerbDefinition, width = 0): string {
  const changes = change === undefined ? "" : `; change {${Object.keys(change.shape).join(",")}}`;
  return `${signature.padEnd(width)} ${summary}${changes}`;
}
