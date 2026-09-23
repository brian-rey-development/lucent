import { textSchema, WITH_PREVIOUS } from "../catalog/index.ts";
import type { StepAt } from "../model/index.ts";
import type { Raw, StepCursor } from "./types.ts";

export function parseAt(raw: Raw, { locate, path, level }: StepCursor): StepAt {
  const at = raw["at"];
  if (at === undefined || level === "nested") return { kind: "none" };
  const position = locate.value([...path, "at"]);
  if (at === WITH_PREVIOUS) return { kind: "with", position };
  const text = textSchema.safeParse(at);
  return text.success ? { kind: "cue", text: text.data, position } : { kind: "invalid" };
}
