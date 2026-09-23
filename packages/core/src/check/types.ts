import type { Diagnostic } from "../diagnostics/index.ts";
import type { ReadFile } from "../model/index.ts";
import type { Timeline } from "../timeline/index.ts";

export interface CheckOptions {
  readonly readFile: ReadFile;
}

export interface Report {
  readonly ok: boolean;
  readonly errors: number;
  readonly warnings: number;
  readonly diagnostics: readonly Diagnostic[];
  readonly timeline: Timeline;
}
