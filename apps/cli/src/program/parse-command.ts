import { UsageError } from "../shared/index.ts";
import { CATALOG_OPTIONS, CHECK_OPTIONS, HELP_FLAGS, VERSION_FLAGS } from "./constants.ts";
import { parseOptions } from "./parse-options.ts";
import type { Command } from "./types.ts";

export function parseCommand(argv: readonly string[]): Command {
  const [name, ...args] = argv;
  if (name === undefined || HELP_FLAGS.has(name)) return { name: "help", topic: undefined };
  if (VERSION_FLAGS.has(name)) return { name: "version" };
  if (name === "check") return parseCheck(args);
  if (name === "catalog") return parseCatalog(args);
  throw new UsageError(`unknown command ${name}`);
}

function parseCheck(args: readonly string[]): Command {
  const { values, positionals } = parseOptions(args, CHECK_OPTIONS);
  if (values.help) return { name: "help", topic: "check" };
  const [file, ...extra] = positionals;
  if (file === undefined) throw new UsageError("check needs a file");
  if (extra.length > 0) throw new UsageError("check takes one file");
  return { name: "check", file, json: values.json, scene: values.scene };
}

function parseCatalog(args: readonly string[]): Command {
  const { values, positionals } = parseOptions(args, CATALOG_OPTIONS);
  if (values.help) return { name: "help", topic: "catalog" };
  const [verb, ...extra] = positionals;
  if (extra.length > 0) throw new UsageError("catalog takes one verb");
  if (values.codes && (verb !== undefined || values.schema)) throw new UsageError("--codes takes no verb or --schema");
  if (values.schema && verb === undefined) throw new UsageError("--schema needs a verb");
  return { name: "catalog", verb, schema: values.schema, codes: values.codes };
}
