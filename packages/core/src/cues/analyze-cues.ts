import { createDiagnostic, type Diagnostic, type Problem } from "../diagnostics/index.ts";
import { paragraphsOf, type Cue, type Scene, type Video } from "../model/index.ts";
import { DIGIT } from "./constants.ts";
import { indexCues } from "./index-cues.ts";
import { cueWithDigits, duplicateCue, unusedCue } from "./problems.ts";
import { resolveStepCue } from "./resolve-step-cue.ts";

export function analyzeCues(video: Video): readonly Diagnostic[] {
  return video.scenes.flatMap(analyzeScene);
}

function analyzeScene(scene: Scene): readonly Diagnostic[] {
  const paragraphs = paragraphsOf(scene);
  const cues = paragraphs.flatMap((paragraph) => paragraph.cues);
  const index = indexCues(cues, paragraphs.map(({ text }) => text).join(" "));
  const steps = scene.direction?.steps;
  const resolutions = (steps ?? []).map((step, position) => resolveStepCue(scene, index, step, position === 0));
  const used = new Set(resolutions.flatMap(({ used: cue }) => cue ?? []));
  const withDigits = new Set(cues.filter(({ phrase }) => DIGIT.test(phrase)));
  const unresolved = resolutions.some(({ used: cue, diagnostics }) => cue === undefined && diagnostics.length > 0);
  const known = steps !== undefined && !unresolved && steps.every(({ at }) => at.kind !== "invalid");
  const unused = known
    ? cues.filter((cue) => !cue.malformed && !used.has(cue) && !index.duplicates.has(cue) && !withDigits.has(cue))
    : [];
  return [
    ...report(scene, [...index.duplicates], duplicateCue),
    ...report(scene, [...withDigits], cueWithDigits),
    ...resolutions.flatMap(({ diagnostics }) => diagnostics),
    ...report(scene, unused, unusedCue),
  ];
}

function report(scene: Scene, cues: readonly Cue[], problemOf: (cue: Cue) => Problem): readonly Diagnostic[] {
  return cues.map((cue) =>
    createDiagnostic(problemOf(cue), { where: scene.id, scene: scene.id, position: cue.position }),
  );
}
