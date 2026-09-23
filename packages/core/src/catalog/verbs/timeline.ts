import { z } from "zod";

import { defineVerb } from "../define-verb.ts";
import { textSchema } from "../schema.ts";

export const timeline = defineVerb({
  name: "timeline",
  signature: "timeline {at TEXT, text TEXT}..",
  summary: "events on an axis",
  props: z.strictObject({
    timeline: z.array(z.strictObject({ at: textSchema, text: textSchema })).min(1),
  }),
});
