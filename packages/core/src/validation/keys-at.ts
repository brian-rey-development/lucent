import { z } from "zod";

import type { YamlPath } from "../yaml/index.ts";

type Schema = z.core.$ZodType;

export function keysAt(schema: Schema, path: YamlPath): readonly string[] {
  const node = path.reduce<Schema | undefined>(
    (current, segment) => (current === undefined ? undefined : childOf(current, segment)),
    schema,
  );
  const inner = node === undefined ? undefined : unwrap(node);
  return inner instanceof z.ZodObject ? Object.keys(inner.shape) : [];
}

function childOf(schema: Schema, segment: string | number): Schema | undefined {
  const inner = unwrap(schema);
  if (inner instanceof z.ZodObject && typeof segment === "string") {
    const child: unknown = inner.shape[segment];
    return child instanceof z.core.$ZodType ? child : undefined;
  }
  if (inner instanceof z.ZodArray) return inner.element;
  if (inner instanceof z.ZodRecord) return inner.valueType;
  return undefined;
}

function unwrap(schema: Schema): Schema {
  return schema instanceof z.ZodOptional ? unwrap(schema.unwrap()) : schema;
}
