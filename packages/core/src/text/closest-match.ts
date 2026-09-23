import { CHARACTERS_PER_EDIT, MAX_CANDIDATES, MAX_SUGGESTION_INPUT } from "./constants.ts";

interface Candidate {
  readonly value: string;
  readonly distance: number;
  readonly prefix: number;
}

export function closestMatch(input: string, candidates: Iterable<string>): string | undefined {
  const values = [...candidates];
  if (input.length > MAX_SUGGESTION_INPUT || values.length > MAX_CANDIDATES) return undefined;
  const limit = Math.ceil(input.length / CHARACTERS_PER_EDIT);
  let best: Candidate | undefined;
  for (const value of values) {
    const distance = boundedDistance(input, value, limit);
    const candidate = { value, distance, prefix: sharedPrefix(input, value) };
    if (distance <= limit && (best === undefined || isCloser(candidate, best))) best = candidate;
  }
  return best?.value;
}

function isCloser(a: Candidate, b: Candidate): boolean {
  return a.distance < b.distance || (a.distance === b.distance && a.prefix > b.prefix);
}

function sharedPrefix(a: string, b: string): number {
  let length = 0;
  while (length < a.length && a[length] === b[length]) length++;
  return length;
}

// Optimal string alignment, so "dan" is one edit from "dna". Returns limit + 1 as soon as the limit is exceeded.
function boundedDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let before: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, column) => column);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) current.push(cell(a, b, i, j, [before, previous, current]));
    if (Math.min(...current) > limit) return limit + 1;
    [before, previous] = [previous, current];
  }
  return previous[b.length] ?? limit + 1;
}

function cell(a: string, b: string, i: number, j: number, [before, previous, current]: readonly number[][]): number {
  const cost = a[i - 1] === b[j - 1] ? 0 : 1;
  const swapped = i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1];
  return Math.min(
    (previous?.[j] ?? Infinity) + 1,
    (current?.[j - 1] ?? Infinity) + 1,
    (previous?.[j - 1] ?? Infinity) + cost,
    swapped ? (before?.[j - 2] ?? Infinity) + 1 : Infinity,
  );
}
