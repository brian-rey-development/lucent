import type { Cue } from "../model/index.ts";
import { normalizePhrase } from "../text/index.ts";
import type { CueIndex } from "./types.ts";

export function indexCues(cues: readonly Cue[], narration: string): CueIndex {
  const groups = [...Map.groupBy(cues, keyOf).values()];
  const firsts = groups.flatMap((group) => group.slice(0, 1));
  return {
    byId: new Map(firsts.flatMap((cue) => (cue.id === undefined ? [] : [[cue.id, cue] as const]))),
    byPhrase: Map.groupBy(firsts, ({ phrase }) => normalizePhrase(phrase)),
    suggestions: new Map(firsts.map((cue) => [cue.id ?? normalizePhrase(cue.phrase), cue] as const)),
    duplicates: new Set(groups.flatMap(([, ...rest]) => rest)),
    narration: normalizePhrase(narration),
  };
}

function keyOf({ id, phrase }: Cue): string {
  return id === undefined ? `phrase ${normalizePhrase(phrase)}` : `id ${id}`;
}
