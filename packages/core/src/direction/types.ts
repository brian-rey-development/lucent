import type { StepLevel } from "../catalog/index.ts";
import type { Place } from "../diagnostics/index.ts";
import type { Locator, YamlPath } from "../yaml/index.ts";

export interface StepCursor {
  readonly locate: Locator;
  readonly place: Place;
  readonly path: YamlPath;
  readonly level: StepLevel;
}

export type Raw = Readonly<Record<string, unknown>>;
