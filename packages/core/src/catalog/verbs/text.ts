import { z } from "zod";

import { defineVerb } from "../define-verb.ts";
import { colorNameSchema, sizeSchema, textSchema } from "../schema.ts";

const style = { size: sizeSchema.optional(), color: colorNameSchema.optional() };

export const text = defineVerb({
  name: "text",
  signature: "text TEXT [size s|m|l|xl] [color COLOR]",
  summary: 'text; quoted "*emphasis*" uses the accent color',
  props: z.strictObject({ text: textSchema, ...style }),
  change: z.strictObject({ text: textSchema.optional(), ...style }),
  references: { color: "color" },
});
