import type { Problem } from "../diagnostics/index.ts";
import type { Cue, NarrationItem, Translation } from "../model/index.ts";
import type { Position, TextBlock } from "../text/index.ts";

export interface SceneSource {
  readonly id: string;
  readonly position: Position;
  readonly narration: readonly NarrationItem[];
  readonly block: TextBlock | undefined;
}

export interface TextLine {
  readonly text: string;
  readonly line: number;
  readonly column: number;
}

interface Located {
  readonly line: number;
  readonly column: number;
}

export type Token =
  | { readonly kind: "blank"; readonly line: number }
  | (Located & { readonly kind: "heading"; readonly level: number; readonly text: string })
  | (Located & { readonly kind: "text"; readonly text: string })
  | (Located & { readonly kind: "translation"; readonly language: string; readonly text: string })
  | (Located & { readonly kind: "quote" })
  | (Located & { readonly kind: "pause"; readonly seconds: number })
  | (Located & { readonly kind: "malformed-pause" })
  | (Located & { readonly kind: "unclosed-comment" })
  | FenceToken;

export interface FenceToken extends Located {
  readonly kind: "fence";
  readonly marker: string;
  readonly language: string;
  readonly block: TextBlock;
  readonly closed: boolean;
}

export interface Masked {
  readonly text: string;
  readonly open: boolean;
  readonly opened: number | undefined;
}

export type Lines = readonly [TextLine, ...TextLine[]];

export interface LineStart extends TextLine {
  readonly offset: number;
}

export interface LocatedProblem {
  readonly problem: Problem;
  readonly position: Position;
}

export interface ParagraphInput {
  readonly lines: Lines;
  readonly translations: readonly Translation[];
  readonly index: number;
  readonly scene: string;
}

export interface CueScan {
  readonly spoken: string;
  readonly text: string;
  readonly cues: readonly Cue[];
  readonly problems: readonly LocatedProblem[];
}
