import {
  childrenOf,
  findVerb,
  isModifier,
  PROP_NAMES,
  VERB_NAMES,
  type VerbDefinition,
} from "../catalog/index.ts";
import type { Diagnostic, Result } from "../diagnostics/index.ts";
import type { DeclaredElement, Step } from "../model/index.ts";
import { closestMatch } from "../text/index.ts";
import { describeValue, isRecord, validateValue } from "../validation/index.ts";
import { declareElement } from "./declare-element.ts";
import { findMisplaced } from "./find-misplaced.ts";
import { findVerbKeys } from "./find-verb-keys.ts";
import { omitKeys } from "./omit-keys.ts";
import { parseAt } from "./parse-at.ts";
import { parseChange } from "./parse-change.ts";
import { misplacedModifier, NO_VERB, notAMapping, twoVerbs, unknownVerb } from "./problems.ts";
import { stepDiagnostic } from "./step-diagnostic.ts";
import type { Raw, StepCursor } from "./types.ts";
import { unparsedStep } from "./unparsed-step.ts";

export function parseStep(raw: unknown, cursor: StepCursor): Result<Step> {
  if (!isRecord(raw)) return notMapping(raw, cursor);
  const keys = findVerbKeys(Object.keys(raw));
  const [key, second] = keys;
  if (key === undefined) return withoutVerb(raw, cursor);
  if (second !== undefined) return withTwoVerbs(raw, keys, second, cursor);
  const verb = findVerb(key);
  return verb === undefined ? parseChange(raw, key, cursor) : parseVerbStep(raw, verb, cursor);
}

function notMapping(raw: unknown, cursor: StepCursor): Result<Step> {
  return {
    value: unparsedStep(cursor, { element: "unknown", at: { kind: "invalid" } }),
    diagnostics: [stepDiagnostic(notAMapping(describeValue(raw)), cursor)],
  };
}

function parseVerbStep(raw: Raw, verb: VerbDefinition, cursor: StepCursor): Result<Step> {
  const schema = verb.schemas[cursor.level];
  const misplaced = findMisplaced(raw, schema.shape);
  const validated = validateValue(schema, omitKeys(raw, misplaced), cursor);
  const children = parseChildren(verb, raw, cursor);
  const diagnostics = [
    ...misplacedDiagnostics(misplaced, verb, cursor),
    ...validated.diagnostics,
    ...children.diagnostics,
  ];
  const element = declareElement(raw, verb);
  const parts = { verb, element, children: children.value, at: parseAt(raw, cursor) };
  if (validated.value === undefined) return { value: unparsedStep(cursor, parts), diagnostics };
  const props = omitKeys(validated.value, Object.keys(validated.value).filter(isModifier));
  const position = cursor.locate.key([...cursor.path, verb.name]);
  return { value: { kind: "verb", ...parts, props, path: cursor.path, position }, diagnostics };
}

function misplacedDiagnostics(
  keys: readonly string[],
  verb: VerbDefinition,
  cursor: StepCursor,
): readonly Diagnostic[] {
  const context = cursor.level === "nested" ? "a nested step" : verb.name;
  return keys.map((key) => stepDiagnostic(misplacedModifier(key, context), cursor, key));
}

function withoutVerb(raw: Raw, cursor: StepCursor): Result<Step> {
  const guess = guessVerb(Object.keys(raw));
  if (guess !== undefined) {
    const { key, verb } = guess;
    const diagnostic = stepDiagnostic(unknownVerb(key, verb.name), cursor, key);
    return guessed(raw, verb, declareElement(raw, verb, key), diagnostic, cursor);
  }
  const id = raw["id"];
  const element: DeclaredElement | "unknown" =
    typeof id === "string" ? { id, verb: undefined, asset: undefined, explicit: true } : "unknown";
  return {
    value: unparsedStep(cursor, { element, at: parseAt(raw, cursor) }),
    diagnostics: [stepDiagnostic(NO_VERB, cursor)],
  };
}

function guessVerb(keys: readonly string[]): { key: string; verb: VerbDefinition } | undefined {
  for (const key of keys) {
    if (isModifier(key) || PROP_NAMES.has(key)) continue;
    const name = closestMatch(key, VERB_NAMES);
    const verb = name === undefined ? undefined : findVerb(name);
    if (verb !== undefined) return { key, verb };
  }
  return undefined;
}

function withTwoVerbs(
  raw: Raw,
  keys: readonly string[],
  second: string,
  cursor: StepCursor,
): Result<Step> {
  const verb = keys.map(findVerb).find((found) => found !== undefined);
  const diagnostic = stepDiagnostic(twoVerbs(keys), cursor, second);
  if (verb === undefined)
    return {
      value: unparsedStep(cursor, { element: undefined, at: parseAt(raw, cursor) }),
      diagnostics: [diagnostic],
    };
  return guessed(raw, verb, declareElement(raw, verb), diagnostic, cursor);
}

function guessed(
  raw: Raw,
  verb: VerbDefinition,
  element: DeclaredElement | undefined,
  diagnostic: Diagnostic,
  cursor: StepCursor,
): Result<Step> {
  const children = parseChildren(verb, raw, cursor);
  const value = unparsedStep(cursor, {
    verb,
    element,
    children: children.value,
    at: parseAt(raw, cursor),
  });
  return { value, diagnostics: [diagnostic, ...children.diagnostics] };
}

function parseChildren(
  verb: VerbDefinition,
  raw: Raw,
  cursor: StepCursor,
): Result<readonly Step[]> {
  const parsed = childrenOf(verb, raw).map((child) =>
    parseStep(child.raw, { ...cursor, path: [...cursor.path, ...child.path], level: "nested" }),
  );
  return {
    value: parsed.map(({ value }) => value),
    diagnostics: parsed.flatMap(({ diagnostics }) => diagnostics),
  };
}
