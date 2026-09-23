export const USAGE = `usage: lucent <command> [options]

  check <file> [--scene <id>] [--json]   check a .lucent.md file and estimate its timeline
  catalog [<verb> [--schema]]            list the verbs, or show one verb or its JSON Schema
  catalog --codes                        list every diagnostic code

  -h, --help                             show help; lucent <command> --help for one command
  -v, --version                          show the version`;

export const HELP_FLAGS: ReadonlySet<string> = new Set(["-h", "--help", "help"]);
export const VERSION_FLAGS: ReadonlySet<string> = new Set(["-v", "--version"]);

export const OPTION_NAME = /'(-{1,2}[^' ]+)/;

export const CHECK_OPTIONS = {
  help: { type: "boolean", short: "h", default: false },
  json: { type: "boolean", default: false },
  scene: { type: "string" },
} as const;

export const CATALOG_OPTIONS = {
  help: { type: "boolean", short: "h", default: false },
  schema: { type: "boolean", default: false },
  codes: { type: "boolean", default: false },
} as const;

export const MISSING_VALUE = /argument missing/;

export const PARSE_ERRORS: Readonly<Record<string, (option: string, message: string) => string>> = {
  ERR_PARSE_ARGS_UNKNOWN_OPTION: (option) => `unknown option ${option}`,
  ERR_PARSE_ARGS_INVALID_OPTION_VALUE: (option, message) =>
    MISSING_VALUE.test(message) ? `${option} needs a value` : `${option} takes no value`,
};
