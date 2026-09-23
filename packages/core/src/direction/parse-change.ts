import { isModifier, parseTarget } from "../catalog/index.ts";
import type { Diagnostic, Result } from "../diagnostics/index.ts";
import type { Step, StepAt } from "../model/index.ts";
import { validateValue } from "../validation/index.ts";
import { omitKeys } from "./omit-keys.ts";
import { parseAt } from "./parse-at.ts";
import { invalidTarget, misplacedModifier, NESTED_CHANGE } from "./problems.ts";
import { changeModifiersSchema } from "./schema.ts";
import { stepDiagnostic } from "./step-diagnostic.ts";
import type { Raw, StepCursor } from "./types.ts";
import { unparsedStep } from "./unparsed-step.ts";

export function parseChange(raw: Raw, key: string, cursor: StepCursor): Result<Step> {
  const position = cursor.locate.key([...cursor.path, key]);
  const at = parseAt(raw, cursor);
  if (cursor.level === "nested") return failed(cursor, at, [stepDiagnostic(NESTED_CHANGE, cursor, position)]);
  const target = parseTarget(key);
  if (target === undefined || target.point !== undefined) {
    return failed(cursor, at, [stepDiagnostic(invalidTarget(key), cursor, position)]);
  }
  const { [key]: value, ...rest } = raw;
  const diagnostics = modifierDiagnostics(rest, cursor);
  if (diagnostics.length > 0) return failed(cursor, at, diagnostics);
  return { value: { kind: "change", target: target.id, value, path: cursor.path, position, at }, diagnostics };
}

function modifierDiagnostics(modifiers: Raw, cursor: StepCursor): readonly Diagnostic[] {
  const misplaced = Object.keys(modifiers).filter(
    (key) => isModifier(key) && !Object.hasOwn(changeModifiersSchema.shape, key),
  );
  const misplacedDiagnostics = misplaced.map((key) =>
    stepDiagnostic(misplacedModifier(key, "a state change"), cursor, cursor.locate.key([...cursor.path, key])),
  );
  const validated = validateValue(changeModifiersSchema, omitKeys(modifiers, misplaced), cursor);
  return [...misplacedDiagnostics, ...validated.diagnostics];
}

function failed(cursor: StepCursor, at: StepAt, diagnostics: readonly Diagnostic[]): Result<Step> {
  return { value: unparsedStep(cursor, { element: undefined, at }), diagnostics };
}
