import type { UnparsedStep } from "../model/index.ts";
import type { StepCursor } from "./types.ts";

type Parts = Pick<UnparsedStep, "element"> & Partial<Pick<UnparsedStep, "verb" | "children" | "at">>;

export function unparsedStep({ locate, path }: StepCursor, parts: Parts): UnparsedStep {
  return {
    kind: "unparsed",
    verb: undefined,
    children: [],
    at: { kind: "none" },
    ...parts,
    path,
    position: locate.value(path),
  };
}
