import { z } from "zod";

import { ELEMENT_SIGIL, ID_PATTERN, POINT_SEPARATOR } from "../text/index.ts";
import type { Modifier, ModifierLevel } from "./types.ts";

const SIGIL = `\\${ELEMENT_SIGIL}`;

export const TARGET = new RegExp(
  `^${SIGIL}(?<id>${ID_PATTERN})(?:${POINT_SEPARATOR}(?<point>${ID_PATTERN}))?$`,
);

export const idSchema = z.string().regex(new RegExp(`^${ID_PATTERN}$`), {
  error: "lowercase letters, digits, - or _, starting with a letter",
});
export const colorNameSchema = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_-]*$/, { error: "letters, digits, - or _, starting with a letter" });
export const textSchema = z.string().min(1);
export const sizeSchema = z.enum(["s", "m", "l", "xl"]);
export const durationSchema = z.enum(["fast", "base", "slow"]);
export const entranceSchema = z.enum(["fade", "cut"]);
export const layoutSchema = z.enum(["stack", "row", "split"]);
export const elementSchema = z
  .string()
  .regex(new RegExp(`^${SIGIL}${ID_PATTERN}$`), { error: "$ID" });
export const elementsSchema = z.union([elementSchema, z.array(elementSchema).min(1)], {
  error: "$ID or a list of them",
});
export const targetSchema = z.string().regex(TARGET, { error: "$ID or $ID/POINT" });
export const targetsSchema = z.union([targetSchema, z.array(targetSchema).min(1)], {
  error: "$ID, $ID/POINT or a list of them",
});

export const MODIFIER_SCHEMAS = {
  at: textSchema,
  id: idSchema,
  dur: durationSchema,
  enter: entranceSchema,
} as const satisfies Readonly<Record<Modifier, z.ZodType>>;

export const MODIFIERS_BY_LEVEL: Readonly<Record<ModifierLevel, readonly Modifier[]>> = {
  top: ["at", "id", "dur", "enter"],
  nested: ["id"],
  change: ["at", "dur"],
};

export const ELEMENT_MODIFIERS: ReadonlySet<Modifier> = new Set(["id", "enter"]);
