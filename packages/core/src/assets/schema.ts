import { z } from "zod";

import { idSchema, textSchema } from "../catalog/index.ts";

const FRACTION = "a number from 0 to 1";
const unit = z.number().min(0, { error: FRACTION }).max(1, { error: FRACTION });

export const pointSchema = z.tuple([unit, unit, unit], {
  error: "[U, V, R] with values from 0 to 1",
});

export const manifestSchema = z.record(
  idSchema,
  z.strictObject({
    file: textSchema,
    caption: textSchema.optional(),
    credit: textSchema.optional(),
    points: z.record(idSchema, pointSchema).optional(),
  }),
);
