import { findVerb, formatCatalog, formatVerb, verbJsonSchema, VERBS } from "@lucent/core";

import { EXIT_CODES, CliError, type ExitCode, type Io } from "../../shared/index.ts";
import { formatCodes } from "./format-codes.ts";
import type { CatalogArgs } from "./types.ts";

export function runCatalog({ verb, schema, codes }: CatalogArgs, io: Io): ExitCode {
  if (codes) io.stdout(formatCodes());
  else if (verb === undefined) io.stdout(formatCatalog());
  else io.stdout(describeVerb(verb, schema));
  return EXIT_CODES.ok;
}

function describeVerb(name: string, schema: boolean): string {
  const verb = findVerb(name);
  if (verb === undefined)
    throw new CliError(`unknown verb ${name}; verbs: ${VERBS.map((known) => known.name).join(", ")}`);
  return schema ? JSON.stringify(verbJsonSchema(verb)) : formatVerb(verb);
}
