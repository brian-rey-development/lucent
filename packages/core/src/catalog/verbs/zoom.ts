import { z } from "zod";

import { defineVerb } from "../define-verb.ts";
import { targetSchema } from "../schema.ts";

export const zoom = defineVerb({
  name: "zoom",
  signature: "zoom TARGET [into STEP]",
  summary: "camera pushes through a point; into replaces the screen",
  props: z.strictObject({ zoom: targetSchema, into: z.unknown().optional() }),
  element: "none",
  references: { zoom: "target" },
  children: { into: "one" },
  clearsScreen: true,
});
