import type { z } from "zod";

import type { YamlPath } from "../yaml/index.ts";

export type ElementKind = "asset" | "named" | "none";

export type StepLevel = "top" | "nested";

export type ModifierLevel = StepLevel | "change";

export type Modifier = "at" | "id" | "dur" | "enter";

export type ReferenceKind = "asset" | "point" | "target" | "hide" | "color";

export type ChildKind = "one" | "many";

export interface VerbDefinition {
  readonly name: string;
  readonly signature: string;
  readonly summary: string;
  readonly props: z.ZodObject;
  readonly change: z.ZodObject | undefined;
  readonly element: ElementKind;
  readonly references: Readonly<Partial<Record<string, ReferenceKind>>>;
  readonly children: Readonly<Partial<Record<string, ChildKind>>>;
  readonly clearsScreen: boolean;
  readonly schemas: Readonly<Record<StepLevel, z.ZodObject>>;
}

export interface VerbInput<Shape extends z.core.$ZodShape> {
  readonly name: keyof Shape & string;
  readonly signature: string;
  readonly summary: string;
  readonly props: z.ZodObject<Shape, z.core.$strict>;
  readonly change?: z.ZodObject;
  readonly element?: ElementKind;
  readonly references?: Readonly<Partial<Record<keyof Shape & string, ReferenceKind>>>;
  readonly children?: Readonly<Partial<Record<keyof Shape & string, ChildKind>>>;
  readonly clearsScreen?: boolean;
}

export interface Target {
  readonly id: string;
  readonly point: string | undefined;
}

interface NamedReference<Kind extends ReferenceKind> {
  readonly kind: Kind;
  readonly name: string;
  readonly path: YamlPath;
}

interface TargetReference<Kind extends ReferenceKind> {
  readonly kind: Kind;
  readonly target: Target;
  readonly path: YamlPath;
}

export type Reference =
  | NamedReference<"asset">
  | NamedReference<"point">
  | NamedReference<"color">
  | TargetReference<"target">
  | TargetReference<"hide">;

export interface Child {
  readonly raw: unknown;
  readonly path: YamlPath;
}
