import { z } from "zod";

import { defineVerb } from "../define-verb.ts";

const value = z.strictObject({
  turning: z.boolean().optional(),
  colored: z.boolean().optional(),
});

export const helix = defineVerb({
  name: "helix",
  signature: "helix {[turning true|false], [colored true|false]}",
  summary: "DNA double helix",
  props: z.strictObject({ helix: value }),
  change: value,
});
