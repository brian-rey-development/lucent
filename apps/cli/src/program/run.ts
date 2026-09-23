import { CATALOG_HELP, runCatalog } from "../commands/catalog/index.ts";
import { CHECK_HELP, runCheck } from "../commands/check/index.ts";
import {
  CliError,
  EXIT_CODES,
  PROGRAM,
  UsageError,
  type ExitCode,
  type Io,
} from "../shared/index.ts";
import { USAGE } from "./constants.ts";
import { parseCommand } from "./parse-command.ts";
import type { Command, Topic } from "./types.ts";

const HELP: Readonly<Record<NonNullable<Topic>, string>> = {
  check: CHECK_HELP,
  catalog: CATALOG_HELP,
};

export async function run(argv: readonly string[], io: Io): Promise<ExitCode> {
  let command: Command | undefined;
  try {
    command = parseCommand(argv);
    return await execute(command, io);
  } catch (error) {
    if (!(error instanceof CliError)) throw error;
    if (command?.name === "check" && command.json)
      io.stdout(JSON.stringify({ ok: false, error: error.message }));
    else
      io.stderr(
        `${PROGRAM}: ${error.message}${error instanceof UsageError ? `; run ${PROGRAM} --help` : ""}`,
      );
    return error.exitCode;
  }
}

async function execute(command: Command, io: Io): Promise<ExitCode> {
  if (command.name === "check") return runCheck(command, io);
  if (command.name === "catalog") return runCatalog(command, io);
  if (command.name === "version") io.stdout(io.version);
  else io.stdout(command.topic === undefined ? USAGE : HELP[command.topic]);
  return EXIT_CODES.ok;
}
