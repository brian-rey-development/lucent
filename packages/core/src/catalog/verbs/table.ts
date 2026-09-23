import { z } from "zod";

import { defineVerb } from "../define-verb.ts";

const cell = z.union([z.string(), z.number()], { error: "text or a number" });

export const table = defineVerb({
  name: "table",
  signature: "table ROW..",
  summary: "table; a ROW is CELL.., the first row is the header",
  props: z.strictObject({ table: z.array(z.array(cell).min(1)).min(1) }),
});
