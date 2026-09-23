import { z } from "zod";

import { defineVerb } from "../define-verb.ts";
import { textSchema } from "../schema.ts";

export const title = defineVerb({
  name: "title",
  signature: "title TEXT [sub TEXT]",
  summary: "title card",
  props: z.strictObject({ title: textSchema, sub: textSchema.optional() }),
});
