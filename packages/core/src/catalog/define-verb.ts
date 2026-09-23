import type { z } from "zod";

import { modifierShape } from "./modifier-shape.ts";
import type { VerbDefinition, VerbInput } from "./types.ts";

export function defineVerb<Shape extends z.core.$ZodShape>(
  input: VerbInput<Shape>,
): VerbDefinition {
  const element = input.element ?? "named";
  return {
    name: input.name,
    signature: input.signature,
    summary: input.summary,
    props: input.props,
    change: input.change,
    element,
    references: input.references ?? {},
    children: input.children ?? {},
    clearsScreen: input.clearsScreen ?? false,
    schemas: {
      top: input.props.extend(modifierShape("top", element)),
      nested: input.props.extend(modifierShape("nested", element)),
    },
  };
}
