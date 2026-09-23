import { EXIT_CODES } from "./constants.ts";
import type { ExitCode } from "./types.ts";

export class CliError extends Error {
  override readonly name: string = "CliError";
  readonly exitCode: ExitCode = EXIT_CODES.usage;
}

export class UsageError extends CliError {
  override readonly name: string = "UsageError";
}

export class InputError extends CliError {
  override readonly name: string = "InputError";
  override readonly exitCode: ExitCode = EXIT_CODES.input;
}
