import { elementsSchema, parseTarget } from "../catalog/index.ts";
import { createDiagnostic, type Place, type Result } from "../diagnostics/index.ts";
import type { Direction, KeptElement, Step } from "../model/index.ts";
import type { TextBlock } from "../text/index.ts";
import { isRecord, readYaml, validateValue } from "../validation/index.ts";
import type { Locator, ParsedYaml } from "../yaml/index.ts";
import { parseStep } from "./parse-step.ts";
import { BLOCK_IS_LIST, MISSING_DO } from "./problems.ts";
import { blockSchema } from "./schema.ts";

export function parseDirection(block: TextBlock, scene: string): Result<Direction | undefined> {
  const place = { where: scene, scene };
  const read = readYaml(block, place);
  if (read.value === undefined) return { value: undefined, diagnostics: read.diagnostics };
  const parsed = directionFrom(read.value, block, place);
  return { value: parsed.value, diagnostics: [...read.diagnostics, ...parsed.diagnostics] };
}

function directionFrom(
  { value: raw, locate }: ParsedYaml,
  block: TextBlock,
  place: Place,
): Result<Direction | undefined> {
  if (raw === null) {
    const diagnostic = createDiagnostic(MISSING_DO, {
      ...place,
      position: { line: block.firstLine - 1, column: 1 },
    });
    return { value: { keep: [], steps: [], locate }, diagnostics: [diagnostic] };
  }
  if (Array.isArray(raw)) {
    const diagnostic = createDiagnostic(BLOCK_IS_LIST, { ...place, position: locate.value([]) });
    return { value: undefined, diagnostics: [diagnostic] };
  }
  return directionOf(raw, locate, place);
}

function directionOf(raw: unknown, locate: Locator, place: Place): Result<Direction> {
  const { diagnostics } = validateValue(blockSchema, raw, { locate, path: [], place });
  const values = isRecord(raw) ? raw : {};
  const steps = parseSteps(values["do"], locate, place);
  const direction = { keep: keptElements(values["keep"], locate), steps: steps.value, locate };
  return { value: direction, diagnostics: [...diagnostics, ...steps.diagnostics] };
}

function parseSteps(
  steps: unknown,
  locate: Locator,
  place: Place,
): Result<readonly Step[] | undefined> {
  if (!Array.isArray(steps)) return { value: undefined, diagnostics: [] };
  const parsed = steps.map((raw: unknown, index) =>
    parseStep(raw, { locate, place, path: ["do", index], level: "top" }),
  );
  return {
    value: parsed.map(({ value }) => value),
    diagnostics: parsed.flatMap(({ diagnostics }) => diagnostics),
  };
}

function keptElements(keep: unknown, locate: Locator): readonly KeptElement[] | undefined {
  if (keep === undefined) return [];
  const parsed = elementsSchema.safeParse(keep);
  if (!parsed.success) return undefined;
  const entries =
    typeof parsed.data === "string"
      ? [{ text: parsed.data, path: ["keep"] }]
      : parsed.data.map((text, index) => ({ text, path: ["keep", index] }));
  return entries.flatMap(({ text, path }) => {
    const target = parseTarget(text);
    return target === undefined ? [] : [{ id: target.id, position: locate.value(path) }];
  });
}
