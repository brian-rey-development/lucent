import { parseArgs, type ParseArgsOptionsConfig } from "node:util";

import { UsageError } from "../shared/index.ts";
import { OPTION_NAME, PARSE_ERRORS } from "./constants.ts";

type Parsed<Options extends ParseArgsOptionsConfig> = ReturnType<
  typeof parseArgs<{ args: string[]; options: Options; allowPositionals: true }>
>;

export function parseOptions<Options extends ParseArgsOptionsConfig>(
  args: readonly string[],
  options: Options,
): Parsed<Options> {
  try {
    return parseArgs({ args: [...args], options, allowPositionals: true });
  } catch (error) {
    throw new UsageError(describe(error), { cause: error });
  }
}

function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const option = OPTION_NAME.exec(error.message)?.[1] ?? "";
  return PARSE_ERRORS[code]?.(option, error.message) ?? error.message.toLowerCase();
}
