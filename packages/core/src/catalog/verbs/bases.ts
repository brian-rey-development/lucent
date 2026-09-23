import { z } from "zod";

import { defineVerb } from "../define-verb.ts";

const sequence = z.string().regex(/^[ACGT]+$/, { error: "letters A, C, G and T" });

export const bases = defineVerb({
  name: "bases",
  signature: "bases ACGT",
  summary: "base tiles that morph to a new seq",
  props: z.strictObject({ bases: sequence }),
  change: z.strictObject({ seq: sequence }),
});
