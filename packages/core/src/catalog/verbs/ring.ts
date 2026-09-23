import { z } from "zod";

import { defineVerb } from "../define-verb.ts";
import { colorNameSchema, targetsSchema, textSchema } from "../schema.ts";

export const ring = defineVerb({
  name: "ring",
  signature: "ring TARGET.. [label TEXT] [shape circle|ellipse|band] [color COLOR]",
  summary: "ring around targets",
  props: z.strictObject({
    ring: targetsSchema,
    label: textSchema.optional(),
    shape: z.enum(["circle", "ellipse", "band"]).optional(),
    color: colorNameSchema.optional(),
  }),
  references: { ring: "target", color: "color" },
});
