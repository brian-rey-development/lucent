import type { VerbDefinition } from "../catalog/index.ts";
import type { Scene, Video } from "../model/index.ts";
import type { Locator } from "../yaml/index.ts";

export interface Element {
  readonly id: string;
  readonly verb: VerbDefinition | undefined;
  readonly asset: string | undefined;
  readonly parent: string | undefined;
}

export interface Screen {
  readonly elements: Map<string, Element>;
  readonly gone: Map<string, string>;
  readonly ambiguous: Set<string>;
  partial: boolean;
}

export interface Walk {
  readonly video: Video;
  readonly scene: Scene;
  readonly locate: Locator;
  readonly screen: Screen;
}
