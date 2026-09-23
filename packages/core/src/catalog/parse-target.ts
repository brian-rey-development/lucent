import { TARGET } from "./schema.ts";
import type { Target } from "./types.ts";

export function parseTarget(text: string): Target | undefined {
  const groups = TARGET.exec(text)?.groups;
  if (groups?.["id"] === undefined) return undefined;
  return { id: groups["id"], point: groups["point"] };
}
