import { SECONDS_PER_MINUTE } from "./constants.ts";

export function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const rest = Math.floor(seconds % SECONDS_PER_MINUTE);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
