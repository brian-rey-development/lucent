import type { z } from "zod";

import { ELEMENT_MODIFIERS, MODIFIER_SCHEMAS, MODIFIERS_BY_LEVEL } from "./schema.ts";
import type { ElementKind, ModifierLevel } from "./types.ts";

export function modifierShape(
  level: ModifierLevel,
  element: ElementKind,
): Readonly<Record<string, z.ZodOptional>> {
  const allowed = MODIFIERS_BY_LEVEL[level].filter(
    (name) => element !== "none" || !ELEMENT_MODIFIERS.has(name),
  );
  return Object.fromEntries(allowed.map((name) => [name, MODIFIER_SCHEMAS[name].optional()]));
}
