export const MAX_DIAGNOSTICS = 50;
export const MAX_SCENES = 50;
export const MAX_CUES = 10;
export const SECONDS_PER_MINUTE = 60;

export const CHECK_HELP = `usage: lucent check <file> [--scene <id>] [--json]

Checks a .lucent.md file and prints one line per problem, a summary and the estimated timeline.

  --scene <id>   only that scene's diagnostics and timeline
  --json         the report as JSON

Exit codes: 0 no errors, 1 errors in the file, 2 bad usage, 3 file cannot be read.`;
