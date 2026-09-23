import { parseTarget } from "../catalog/index.ts";
import type { Diagnostic, Result } from "../diagnostics/index.ts";
import type { Step, StepAt } from "../model/index.ts";
import { validateValue } from "../validation/index.ts";
import { findMisplaced } from "./find-misplaced.ts";
import { omitKeys } from "./omit-keys.ts";
import { parseAt } from "./parse-at.ts";
import { invalidTarget, misplacedModifier, NESTED_CHANGE } from "./problems.ts";
import { changeModifiersSchema } from "./schema.ts";
import { stepDiagnostic } from "./step-diagnostic.ts";
import type { Raw, StepCursor } from "./types.ts";
import { unparsedStep } from "./unparsed-step.ts";

export function parseChange(raw: Raw, key: string, cursor: StepCursor): Result<Step> {
  const at = parseAt(raw, cursor);
  if (cursor.level === "nested")
    return failed(cursor, at, [stepDiagnostic(NESTED_CHANGE, cursor, key)]);
  const target = parseTarget(key);
  if (target === undefined || target.point !== undefined)
    return failed(cursor, at, [stepDiagnostic(invalidTarget(key), cursor, key)]);
  const { [key]: value, ...rest } = raw;
  const diagnostics = modifierDiagnostics(rest, cursor);
  if (diagnostics.length > 0) return failed(cursor, at, diagnostics);
  const position = cursor.locate.key([...cursor.path, key]);
  return {
    value: { kind: "change", target: target.id, value, path: cursor.path, position, at },
    diagnostics,
  };
}

function modifierDiagnostics(modifiers: Raw, cursor: StepCursor): readonly Diagnostic[] {
  const misplaced = findMisplaced(modifiers, changeModifiersSchema.shape);
  const validated = validateValue(changeModifiersSchema, omitKeys(modifiers, misplaced), cursor);
  return [
    ...misplaced.map((key) =>
      stepDiagnostic(misplacedModifier(key, "a state change"), cursor, key),
    ),
    ...validated.diagnostics,
  ];
}

function failed(cursor: StepCursor, at: StepAt, diagnostics: readonly Diagnostic[]): Result<Step> {
  return { value: unparsedStep(cursor, { element: undefined, at }), diagnostics };
}
