import type { z } from "zod";

import { CHANGEABLE_VERBS, referencesOf, type Target, type VerbDefinition } from "../catalog/index.ts";
import { createDiagnostic, formatWhere, type Diagnostic, type Problem } from "../diagnostics/index.ts";
import type { ChangeStep, Step, UnparsedStep, VerbStep } from "../model/index.ts";
import { ELEMENT_SIGIL, type Position } from "../text/index.ts";
import { describeValue, isRecord, validateValue } from "../validation/index.ts";
import type { YamlPath } from "../yaml/index.ts";
import { descendantsOf } from "./descendants-of.ts";
import { findProblem } from "./find-problem.ts";
import { changeNotMapping, duplicateId, noState } from "./problems.ts";
import { removeElements } from "./remove-elements.ts";
import { targetProblem } from "./target-problem.ts";
import type { Walk } from "./types.ts";

export function applyStep(walk: Walk, step: Step, parent: string | undefined): readonly Diagnostic[] {
  if (step.kind === "change") return applyChange(walk, step);
  const references = step.kind === "verb" ? checkReferences(walk, step) : [];
  if (step.verb?.clearsScreen === true && step.children.length > 0) {
    removeElements(
      walk.screen,
      [...walk.screen.elements.keys()],
      `was cleared by ${step.verb.name} at ${whereOf(walk, step.path)}`,
    );
    walk.screen.partial = false;
  }
  const placed = placeElement(walk, step, parent);
  const owner = typeof step.element === "object" ? step.element.id : parent;
  const children = step.children.flatMap((child) => applyStep(walk, child, owner));
  return [...references, ...placed, ...children];
}

function checkReferences(walk: Walk, step: VerbStep): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const reference of referencesOf(step.verb, step.props)) {
    const problem = findProblem(walk, reference, step.element?.asset);
    const path = [...step.path, ...reference.path];
    if (problem !== undefined) diagnostics.push(report(walk, problem, path, walk.locate.value(path)));
    else if (reference.kind === "hide") hide(walk, reference.target, step);
  }
  return diagnostics;
}

function hide(walk: Walk, target: Target, step: VerbStep): void {
  const ids = descendantsOf(walk.screen.elements, target.id);
  removeElements(walk.screen, ids, `was hidden at ${whereOf(walk, step.path)}`);
}

function placeElement(walk: Walk, step: VerbStep | UnparsedStep, parent: string | undefined): readonly Diagnostic[] {
  if (step.element === "unknown") walk.screen.partial = true;
  if (step.element === undefined || step.element === "unknown") return [];
  const { id, verb, asset, explicit } = step.element;
  const taken = walk.screen.elements.has(id) || walk.screen.ambiguous.has(id);
  walk.screen.elements.set(id, { id, verb, asset, parent });
  walk.screen.gone.delete(id);
  if (!taken) return [];
  if (!explicit) {
    walk.screen.ambiguous.add(id);
    return [];
  }
  const path = [...step.path, "id"];
  return [report(walk, duplicateId(id), path, walk.locate.value(path))];
}

function applyChange(walk: Walk, step: ChangeStep): readonly Diagnostic[] {
  const path = [...step.path, `${ELEMENT_SIGIL}${step.target}`];
  const missing = targetProblem(walk, { id: step.target, point: undefined });
  if (missing !== undefined) return [report(walk, missing, path, step.position)];
  const verb = walk.screen.elements.get(step.target)?.verb;
  if (verb === undefined) return [];
  const { change } = verb;
  if (change === undefined) return [report(walk, noState(verb.name, CHANGEABLE_VERBS), path, step.position)];
  if (!isRecord(step.value)) {
    const problem = changeNotMapping(step.target, describeValue(step.value), Object.keys(change.shape));
    return [report(walk, problem, path, step.position)];
  }
  return validateChange(walk, verb, change, step.value, path);
}

function validateChange(
  walk: Walk,
  verb: VerbDefinition,
  change: z.ZodObject,
  value: unknown,
  path: YamlPath,
): readonly Diagnostic[] {
  const place = { where: walk.scene.id, scene: walk.scene.id };
  const validated = validateValue(change, value, { locate: walk.locate, path, place });
  if (validated.value === undefined) return validated.diagnostics;
  return referencesOf(verb, validated.value).flatMap((reference) => {
    const problem = findProblem(walk, reference, undefined);
    const referencePath = [...path, ...reference.path];
    return problem === undefined ? [] : [report(walk, problem, referencePath, walk.locate.value(referencePath))];
  });
}

function report(walk: Walk, problem: Problem, path: YamlPath, position: Position): Diagnostic {
  const { id } = walk.scene;
  return createDiagnostic(problem, { where: formatWhere(id, path), scene: id, position });
}

function whereOf(walk: Walk, path: YamlPath): string {
  return formatWhere(walk.scene.id, path);
}
