import { z } from "zod";

import { defineVerb } from "../define-verb.ts";
import { textSchema } from "../schema.ts";

export const number = defineVerb({
  name: "number",
  signature: "number N [fmt TEXT] [unit TEXT]",
  summary: "number that counts to its new value",
  props: z.strictObject({ number: z.number(), fmt: textSchema.optional(), unit: textSchema.optional() }),
  change: z.strictObject({ number: z.number() }),
});
