import type { Child, VerbDefinition } from "./types.ts";

export function childrenOf(
  verb: VerbDefinition,
  props: Readonly<Record<string, unknown>>,
): readonly Child[] {
  return Object.entries(verb.children).flatMap(([key, kind]): readonly Child[] => {
    const value = props[key];
    if (value === undefined) return [];
    if (kind === "many" && Array.isArray(value))
      return value.map((raw: unknown, index) => ({ raw, path: [key, index] }));
    return kind === "one" ? [{ raw: value, path: [key] }] : [];
  });
}
