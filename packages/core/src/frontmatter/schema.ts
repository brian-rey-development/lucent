import { z } from "zod";

import { colorNameSchema, textSchema } from "../catalog/index.ts";

const language = z.string().regex(/^[a-z]{2}$/, { error: "a two-letter code like es" });
const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, { error: 'a quoted color like "#1F8FC4"' });

export const subtitlesSchema = z
  .array(language)
  .min(1)
  .refine((languages) => new Set(languages).size === languages.length, {
    error: "a list with no repeated languages",
  });

export const frontmatterSchema = z.strictObject({
  lucent: z.literal(0),
  title: textSchema,
  voice: z
    .string()
    .regex(/^[a-z0-9-]+\/[a-z0-9_-]+$/, { error: "ENGINE/VOICE, like kokoro/am_fenrir" }),
  subtitles: subtitlesSchema,
  colors: z.record(colorNameSchema, hex).optional(),
  assets: textSchema.optional(),
});
