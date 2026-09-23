import type { YamlPath } from "../yaml/index.ts";
import { parseTarget } from "./parse-target.ts";
import type { Reference, ReferenceKind, VerbDefinition } from "./types.ts";

interface Value {
  readonly text: string;
  readonly path: YamlPath;
}

export function referencesOf(
  verb: VerbDefinition,
  props: Readonly<Record<string, unknown>>,
): readonly Reference[] {
  return Object.entries(verb.references).flatMap(([key, kind]) =>
    kind === undefined
      ? []
      : valuesOf(props[key], key).flatMap((value) => toReference(kind, value)),
  );
}

function valuesOf(value: unknown, key: string): readonly Value[] {
  if (typeof value === "string") return [{ text: value, path: [key] }];
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown, index) =>
    typeof item === "string" ? [{ text: item, path: [key, index] }] : [],
  );
}

function toReference(kind: ReferenceKind, { text, path }: Value): readonly Reference[] {
  if (kind !== "target" && kind !== "hide") return [{ kind, name: text, path }];
  const target = parseTarget(text);
  return target === undefined ? [] : [{ kind, target, path }];
}
