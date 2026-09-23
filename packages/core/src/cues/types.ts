import type { Diagnostic } from "../diagnostics/index.ts";
import type { Cue } from "../model/index.ts";

export interface CueIndex {
  readonly byId: ReadonlyMap<string, Cue>;
  readonly byPhrase: ReadonlyMap<string, readonly Cue[]>;
  readonly suggestions: ReadonlyMap<string, Cue>;
  readonly duplicates: ReadonlySet<Cue>;
  readonly narration: string;
}

export interface Resolution {
  readonly used: Cue | undefined;
  readonly diagnostics: readonly Diagnostic[];
}
