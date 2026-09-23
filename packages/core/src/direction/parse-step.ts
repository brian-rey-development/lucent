import { childrenOf, findVerb, isModifier, PROP_NAMES, VERB_NAMES, type VerbDefinition } from "../catalog/index.ts";
import type { Diagnostic, Result } from "../diagnostics/index.ts";
import type { DeclaredElement, Step } from "../model/index.ts";
import { closestMatch } from "../text/index.ts";
import { describeValue, isRecord, validateValue } from "../validation/index.ts";
import { declareElement } from "./declare-element.ts";
import { findVerbKeys } from "./find-verb-keys.ts";
import { omitKeys } from "./omit-keys.ts";
import { parseAt } from "./parse-at.ts";
import { parseChange } from "./parse-change.ts";
import { misplacedModifier, NO_VERB, notAMapping, twoVerbs, unknownVerb } from "./problems.ts";
import { stepDiagnostic } from "./step-diagnostic.ts";
import type { Raw, StepCursor } from "./types.ts";
import { unparsedStep } from "./unparsed-step.ts";

export function parseStep(raw: unknown, cursor: StepCursor): Result<Step> {
  if (!isRecord(raw)) {
    const diagnostic = stepDiagnostic(notAMapping(describeValue(raw)), cursor, cursor.locate.value(cursor.path));
    return { value: unparsedStep(cursor, { element: "unknown", at: { kind: "invalid" } }), diagnostics: [diagnostic] };
  }
  const keys = findVerbKeys(Object.keys(raw));
  const [key, second] = keys;
  if (key === undefined) return withoutVerb(raw, cursor);
  const verb = findVerb(key);
  if (second !== undefined) return withTwoVerbs(raw, keys, cursor.locate.key([...cursor.path, second]), cursor);
  return verb === undefined ? parseChange(raw, key, cursor) : parseVerbStep(raw, verb, cursor);
}

function parseVerbStep(raw: Raw, verb: VerbDefinition, cursor: StepCursor): Result<Step> {
  const schema = verb.schemas[cursor.level];
  const misplaced = Object.keys(raw).filter((key) => isModifier(key) && !Object.hasOwn(schema.shape, key));
  const context = cursor.level === "nested" ? "a nested step" : verb.name;
  const validated = validateValue(schema, omitKeys(raw, misplaced), cursor);
  const children = parseChildren(verb, raw, cursor);
  const diagnostics = [
    ...misplaced.map((key) =>
      stepDiagnostic(misplacedModifier(key, context), cursor, cursor.locate.key([...cursor.path, key])),
    ),
    ...validated.diagnostics,
    ...children.diagnostics,
  ];
  const parts = { verb, element: declareElement(raw, verb), children: children.value, at: parseAt(raw, cursor) };
  if (validated.value === undefined) return { value: unparsedStep(cursor, parts), diagnostics };
  const props = omitKeys(validated.value, Object.keys(validated.value).filter(isModifier));
  const position = cursor.locate.key([...cursor.path, verb.name]);
  return { value: { kind: "verb", ...parts, props, path: cursor.path, position }, diagnostics };
}

function withoutVerb(raw: Raw, cursor: StepCursor): Result<Step> {
  for (const key of Object.keys(raw).filter((candidate) => !isModifier(candidate) && !PROP_NAMES.has(candidate))) {
    const name = closestMatch(key, VERB_NAMES);
    const verb = name === undefined ? undefined : findVerb(name);
    if (verb === undefined) continue;
    const diagnostic = stepDiagnostic(unknownVerb(key, verb.name), cursor, cursor.locate.key([...cursor.path, key]));
    return guessed(raw, verb, declareElement(raw, verb, key), diagnostic, cursor);
  }
  const id = raw["id"];
  const element = typeof id === "string" ? { id, verb: undefined, asset: undefined, explicit: true } : "unknown";
  const diagnostic = stepDiagnostic(NO_VERB, cursor, cursor.locate.value(cursor.path));
  return { value: unparsedStep(cursor, { element, at: parseAt(raw, cursor) }), diagnostics: [diagnostic] };
}

function withTwoVerbs(
  raw: Raw,
  keys: readonly string[],
  position: Diagnostic["position"],
  cursor: StepCursor,
): Result<Step> {
  const verb = keys.map(findVerb).find((found) => found !== undefined);
  const diagnostic = stepDiagnostic(twoVerbs(keys), cursor, position);
  if (verb === undefined)
    return { value: unparsedStep(cursor, { element: undefined, at: parseAt(raw, cursor) }), diagnostics: [diagnostic] };
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
  const value = unparsedStep(cursor, { verb, element, children: children.value, at: parseAt(raw, cursor) });
  return { value, diagnostics: [diagnostic, ...children.diagnostics] };
}

function parseChildren(verb: VerbDefinition, raw: Raw, cursor: StepCursor): Result<readonly Step[]> {
  const parsed = childrenOf(verb, raw).map((child) =>
    parseStep(child.raw, { ...cursor, path: [...cursor.path, ...child.path], level: "nested" }),
  );
  return { value: parsed.map(({ value }) => value), diagnostics: parsed.flatMap(({ diagnostics }) => diagnostics) };
}
