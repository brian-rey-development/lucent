import { z } from "zod";

import { defineVerb } from "../define-verb.ts";
import { textSchema } from "../schema.ts";

const value = z.strictObject({
  share: z.number().min(0).max(1, { error: "a number from 0 to 1" }),
  label: textSchema,
  rest: textSchema.optional(),
});

export const bar = defineVerb({
  name: "bar",
  signature: "bar {share 0..1, label TEXT, [rest TEXT]}",
  summary: "proportion bar",
  props: z.strictObject({ bar: value }),
  change: value.partial(),
});
