import { z } from "zod";

import { defineVerb } from "../define-verb.ts";
import { elementsSchema } from "../schema.ts";

export const hide = defineVerb({
  name: "hide",
  signature: "hide $ID..",
  summary: "exit; the layout closes the gap",
  props: z.strictObject({ hide: elementsSchema }),
  element: "none",
  references: { hide: "hide" },
});
