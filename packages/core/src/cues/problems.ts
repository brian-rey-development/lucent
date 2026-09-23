import { oneOf, quote, type Problem } from "../diagnostics/index.ts";
import type { Cue } from "../model/index.ts";

export const NO_PREVIOUS: Problem = {
  code: "E209",
  message: "at: with has no previous step",
  fix: "use a cue or remove at",
};

export function duplicateCue({ phrase, id }: Cue): Problem {
  if (id !== undefined) return { code: "E137", message: `duplicate cue id ${id}`, fix: "rename one" };
  return { code: "E137", message: `duplicate cue ${quote(phrase)}`, fix: "give one an id: [PHRASE|ID]" };
}

export function cueWithDigits({ phrase }: Cue): Problem {
  return { code: "E205", message: `cue ${quote(phrase)} has digits`, fix: "spell the number as spoken" };
}

export function unusedCue({ phrase, id }: Cue): Problem {
  return {
    code: "W201",
    message: `cue ${quote(phrase)} is unused`,
    fix: `add at: ${id ?? phrase} to a step or unmark it`,
  };
}

export function cueHasId(text: string, cues: readonly Cue[]): Problem {
  const ids = cues.flatMap(({ id }) => id ?? []);
  return { code: "E204", message: `cue ${quote(text)} has an id`, fix: `use ${oneOf(ids)}` };
}

export function unmarkedCue(text: string, fix: string): Problem {
  return { code: "E204", message: `cue ${quote(text)} is not marked`, fix };
}

export function suggestion({ phrase, id }: Cue): string {
  return `use ${id ?? quote(phrase)}`;
}
