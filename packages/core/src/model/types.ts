import type { VerbDefinition } from "../catalog/index.ts";
import type { Position } from "../text/index.ts";
import type { Locator, YamlPath } from "../yaml/index.ts";

export type AssetsSource =
  | { readonly kind: "none" }
  | { readonly kind: "invalid" }
  | { readonly kind: "file"; readonly path: string; readonly position: Position };

export interface Settings {
  readonly subtitles: readonly string[] | undefined;
  readonly colors: ReadonlySet<string> | undefined;
  readonly assets: AssetsSource;
}

export interface SourceLine {
  readonly text: string;
  readonly spoken: string;
  readonly line: number;
}

export interface Cue {
  readonly phrase: string;
  readonly id: string | undefined;
  readonly paragraph: number;
  readonly wordIndex: number;
  readonly position: Position;
  readonly end: Position;
  readonly malformed: boolean;
}

export interface Translation {
  readonly language: string | undefined;
  readonly text: string;
  readonly position: Position;
}

export interface Paragraph {
  readonly kind: "paragraph";
  readonly index: number;
  readonly text: string;
  readonly lines: readonly SourceLine[];
  readonly cues: readonly Cue[];
  readonly translations: readonly Translation[];
  readonly position: Position;
}

export interface Pause {
  readonly kind: "pause";
  readonly seconds: number;
  readonly position: Position;
}

export type NarrationItem = Paragraph | Pause;

export type StepAt =
  | { readonly kind: "none" }
  | { readonly kind: "invalid" }
  | { readonly kind: "with"; readonly position: Position }
  | { readonly kind: "cue"; readonly text: string; readonly position: Position };

export interface DeclaredElement {
  readonly id: string;
  readonly verb: VerbDefinition | undefined;
  readonly asset: string | undefined;
  readonly explicit: boolean;
}

interface StepBase {
  readonly path: YamlPath;
  readonly position: Position;
  readonly at: StepAt;
}

export interface VerbStep extends StepBase {
  readonly kind: "verb";
  readonly verb: VerbDefinition;
  readonly element: DeclaredElement | undefined;
  readonly props: Readonly<Record<string, unknown>>;
  readonly children: readonly Step[];
}

export interface ChangeStep extends StepBase {
  readonly kind: "change";
  readonly target: string;
  readonly value: unknown;
}

export interface UnparsedStep extends StepBase {
  readonly kind: "unparsed";
  readonly verb: VerbDefinition | undefined;
  readonly element: DeclaredElement | "unknown" | undefined;
  readonly children: readonly Step[];
}

export type Step = VerbStep | ChangeStep | UnparsedStep;

export interface KeptElement {
  readonly id: string;
  readonly position: Position;
}

export interface Direction {
  readonly keep: readonly KeptElement[] | undefined;
  readonly steps: readonly Step[] | undefined;
  readonly locate: Locator;
}

export interface Scene {
  readonly id: string;
  readonly position: Position;
  readonly narration: readonly NarrationItem[];
  readonly direction: Direction | undefined;
}

export type Point = readonly [u: number, v: number, radius: number];

export interface Asset {
  readonly points: ReadonlyMap<string, Point | undefined> | undefined;
}

export type Assets =
  | { readonly status: "none" }
  | { readonly status: "unavailable" }
  | {
      readonly status: "loaded";
      readonly manifest: ReadonlyMap<string, Asset | undefined>;
      readonly complete: boolean;
    };

export interface Video {
  readonly settings: Settings;
  readonly scenes: readonly Scene[];
  readonly assets: Assets;
}

export type FileFound = { readonly ok: true } | { readonly ok: false; readonly reason: string };

export type FileRead =
  { readonly ok: true; readonly text: string } | Exclude<FileFound, { ok: true }>;

export interface FileAccess {
  readonly readFile: (path: string) => Promise<FileRead>;
  readonly findFile: (path: string) => Promise<FileFound>;
}
