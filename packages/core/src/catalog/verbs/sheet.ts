import { z } from "zod";

import { defineVerb } from "../define-verb.ts";

export const sheet = defineVerb({
  name: "sheet",
  signature: "sheet STEP..",
  summary: "translucent full-frame sheet; children stack",
  props: z.strictObject({ sheet: z.array(z.unknown()).min(1) }),
  children: { sheet: "many" },
});
