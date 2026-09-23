import type { Place, Problem } from "../diagnostics/index.ts";
import type { Locator, YamlPath } from "../yaml/index.ts";

export interface Site {
  readonly locate: Locator;
  readonly path: YamlPath;
  readonly place: Place;
}

export interface Issue {
  readonly problem: Problem;
  readonly path: YamlPath;
  readonly at: "key" | "value";
  readonly key?: string | undefined;
  readonly renames?: string | undefined;
}
