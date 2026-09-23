import { createDiagnostic, formatWhere, type Problem } from "../diagnostics/index.ts";
import type { Scene, Step } from "../model/index.ts";
import { closestMatch, normalizePhrase, type Position } from "../text/index.ts";
import { cueHasId, NO_PREVIOUS, suggestion, unmarkedCue } from "./problems.ts";
import type { CueIndex, Resolution } from "./types.ts";

const NOTHING: Resolution = { used: undefined, diagnostics: [] };

export function resolveStepCue(scene: Scene, index: CueIndex, step: Step, first: boolean): Resolution {
  const { at } = step;
  if (at.kind === "none" || at.kind === "invalid" || (at.kind === "with" && !first)) return NOTHING;
  const report = (problem: Problem, position: Position): Resolution["diagnostics"] => [
    createDiagnostic(problem, { where: formatWhere(scene.id, [...step.path, "at"]), scene: scene.id, position }),
  ];
  if (at.kind === "with") return { used: undefined, diagnostics: report(NO_PREVIOUS, at.position) };
  const byId = index.byId.get(at.text);
  if (byId !== undefined) return { used: byId, diagnostics: [] };
  const matches = index.byPhrase.get(normalizePhrase(at.text)) ?? [];
  const plain = matches.find(({ id }) => id === undefined);
  if (plain !== undefined) return { used: plain, diagnostics: [] };
  const [withId] = matches;
  if (withId !== undefined) return { used: withId, diagnostics: report(cueHasId(at.text, matches), at.position) };
  const key = closestMatch(normalizePhrase(at.text), index.suggestions.keys());
  const closest = key === undefined ? undefined : index.suggestions.get(key);
  const fix = closest === undefined ? markFix(index.narration, at.text) : suggestion(closest);
  return { used: closest, diagnostics: report(unmarkedCue(at.text, fix), at.position) };
}

function markFix(narration: string, text: string): string {
  return narration.includes(normalizePhrase(text)) ? `mark it: [${text}]` : "mark a phrase with [ ]";
}
