import { z } from "zod";

import { defineVerb } from "../define-verb.ts";
import { targetSchema, textSchema } from "../schema.ts";

export const measure = defineVerb({
  name: "measure",
  signature: "measure TARGET label TEXT [side left|right]",
  summary: "dimension marker",
  props: z.strictObject({
    measure: targetSchema,
    label: textSchema,
    side: z.enum(["left", "right"]).optional(),
  }),
  references: { measure: "target" },
});
