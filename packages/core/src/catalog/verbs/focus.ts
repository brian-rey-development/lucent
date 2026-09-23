import { z } from "zod";

import { defineVerb } from "../define-verb.ts";
import { targetSchema } from "../schema.ts";

export const focus = defineVerb({
  name: "focus",
  signature: "focus TARGET..|none",
  summary: "dim everything else to 30%",
  props: z.strictObject({
    focus: z.union([targetSchema, z.array(targetSchema).min(1), z.literal("none")], {
      error: "$ID, $ID/POINT, a list of them, or none",
    }),
  }),
  element: "none",
  references: { focus: "target" },
});
