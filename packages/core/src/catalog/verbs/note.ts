import { z } from "zod";

import { defineVerb } from "../define-verb.ts";
import { textSchema } from "../schema.ts";

export const note = defineVerb({
  name: "note",
  signature: "note TEXT",
  summary: "small print, such as a source",
  props: z.strictObject({ note: textSchema }),
});
