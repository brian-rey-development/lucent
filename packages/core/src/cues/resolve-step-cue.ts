import { createDiagnostic, formatWhere, type Problem } from "../diagnostics/index.ts";
import type { Cue, Scene, Step } from "../model/index.ts";
import { closestMatch, normalizePhrase } from "../text/index.ts";
import { cueHasId, NO_PREVIOUS, suggestion, unmarkedCue } from "./problems.ts";
import type { CueIndex, Resolution } from "./types.ts";

const NOTHING: Resolution = { used: undefined, diagnostics: [] };

interface Match {
  readonly used: Cue | undefined;
  readonly problem?: Problem;
}

export function resolveStepCue(
  scene: Scene,
  index: CueIndex,
  step: Step,
  first: boolean,
): Resolution {
  const { at } = step;
  if (at.kind === "none" || at.kind === "invalid" || (at.kind === "with" && !first)) return NOTHING;
  const { used, problem }: Match =
    at.kind === "with" ? { used: undefined, problem: NO_PREVIOUS } : matchCue(index, at.text);
  if (problem === undefined) return { used, diagnostics: [] };
  const where = formatWhere(scene.id, [...step.path, "at"]);
  return {
    used,
    diagnostics: [createDiagnostic(problem, { where, scene: scene.id, position: at.position })],
  };
}

function matchCue(index: CueIndex, text: string): Match {
  const byId = index.byId.get(text);
  if (byId !== undefined) return { used: byId };
  const matches = index.byPhrase.get(normalizePhrase(text)) ?? [];
  const plain = matches.find(({ id }) => id === undefined);
  if (plain !== undefined) return { used: plain };
  const [withId] = matches;
  if (withId !== undefined) return { used: withId, problem: cueHasId(text, matches) };
  const key = closestMatch(normalizePhrase(text), index.suggestions.keys());
  const closest = key === undefined ? undefined : index.suggestions.get(key);
  const fix = closest === undefined ? markFix(index.narration, text) : suggestion(closest);
  return { used: closest, problem: unmarkedCue(text, fix) };
}

function markFix(narration: string, text: string): string {
  return narration.includes(normalizePhrase(text))
    ? `mark it: [${text}]`
    : "mark a phrase with [ ]";
}
