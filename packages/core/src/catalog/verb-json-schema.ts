import { z } from "zod";

import type { VerbDefinition } from "./types.ts";

export function verbJsonSchema(verb: VerbDefinition): Readonly<Record<string, unknown>> {
  const { $schema: _schema, ...schema } = z.toJSONSchema(verb.schemas.top);
  return schema;
}
