import { quote, type Problem } from "../diagnostics/index.ts";

export function unspeakable(symbol: string, fix: string): Problem {
  return { code: "E501", message: `${quote(symbol)} cannot be spoken`, fix };
}

export function digits(number: string): Problem {
  return { code: "W502", message: `digits ${number} may be misread`, fix: "spell the number as spoken" };
}

export function tooLong(words: number): Problem {
  return { code: "W402", message: `${words} words in one paragraph`, fix: "split it into two paragraphs" };
}
