import { z } from "zod";

import { elementsSchema, entranceSchema, layoutSchema, modifierShape } from "../catalog/index.ts";

export const blockSchema = z.strictObject({
  keep: elementsSchema.optional(),
  enter: entranceSchema.optional(),
  layout: layoutSchema.optional(),
  do: z.array(z.unknown()).min(1),
});

export const changeModifiersSchema = z.strictObject(modifierShape("change", "named"));
