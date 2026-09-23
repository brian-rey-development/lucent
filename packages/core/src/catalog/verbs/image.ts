import { z } from "zod";

import { defineVerb } from "../define-verb.ts";
import { idSchema, sizeSchema } from "../schema.ts";

export const image = defineVerb({
  name: "image",
  signature: "image ASSET [size s|m|l|xl]",
  summary: "image placed in the layout",
  props: z.strictObject({ image: idSchema, size: sizeSchema.optional() }),
  element: "asset",
  references: { image: "asset" },
});
