import type { Diagnostic, Result } from "../diagnostics/index.ts";
import type { Scene, Video } from "../model/index.ts";
import { applyStep } from "./apply-step.ts";
import { createScreen } from "./create-screen.ts";
import { keepElements } from "./keep-elements.ts";
import { NO_MANIFEST } from "./problems.ts";
import type { Screen } from "./types.ts";

export function analyzeReferences(video: Video): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  let previous = createScreen(false);
  for (const scene of video.scenes) {
    const walked = walkScene(video, scene, previous);
    diagnostics.push(...walked.diagnostics);
    previous = walked.value;
  }
  const first = diagnostics.findIndex(isNoManifest);
  return diagnostics.filter((diagnostic, index) => !isNoManifest(diagnostic) || index === first);
}

function walkScene(video: Video, scene: Scene, previous: Screen): Result<Screen> {
  const { direction } = scene;
  if (direction === undefined) return { value: createScreen(true), diagnostics: [] };
  const kept = keepElements(direction.keep, previous, scene);
  const screen = kept.value;
  if (direction.steps === undefined) screen.partial = true;
  const walk = { video, scene, locate: direction.locate, screen };
  const steps = (direction.steps ?? []).flatMap((step) => applyStep(walk, step, undefined));
  return { value: screen, diagnostics: [...kept.diagnostics, ...steps] };
}

function isNoManifest({ code, message }: Diagnostic): boolean {
  return code === NO_MANIFEST.code && message === NO_MANIFEST.message;
}
