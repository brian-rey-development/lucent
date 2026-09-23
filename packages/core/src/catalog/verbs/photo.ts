import { z } from "zod";

import { defineVerb } from "../define-verb.ts";
import { idSchema } from "../schema.ts";

export const photo = defineVerb({
  name: "photo",
  signature: "photo ASSET [center POINT] [drift none|slow|fast]",
  summary: "full-bleed photo, caption from the manifest",
  props: z.strictObject({
    photo: idSchema,
    center: idSchema.optional(),
    drift: z.enum(["none", "slow", "fast"]).optional(),
  }),
  element: "asset",
  references: { photo: "asset", center: "point" },
});
