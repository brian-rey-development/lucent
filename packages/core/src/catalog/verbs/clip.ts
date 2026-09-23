import { z } from "zod";

import { defineVerb } from "../define-verb.ts";
import { textSchema } from "../schema.ts";

const seconds = z.number().min(0);

export const clip = defineVerb({
  name: "clip",
  signature: "clip PATH [trim FROM,TO] [mute true|false]",
  summary: "video clip; trim in seconds",
  props: z.strictObject({
    clip: textSchema,
    trim: z.tuple([seconds, seconds], { error: "[FROM, TO] in seconds" }).optional(),
    mute: z.boolean().optional(),
  }),
});
