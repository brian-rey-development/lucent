import { COMMENT_END, COMMENT_START } from "./constants.ts";
import type { Masked } from "./types.ts";

interface Step {
  readonly piece: string;
  readonly next: number;
  readonly inside: boolean;
}

export function maskComments(text: string, open: boolean): Masked {
  let masked = "";
  let index = 0;
  let inside = open;
  let opened: number | undefined;
  while (index < text.length) {
    const step = inside ? insideComment(text, index) : outsideComment(text, index);
    if (!inside && step.inside) opened = step.next - COMMENT_START.length;
    masked += step.piece;
    inside = step.inside;
    index = step.next;
  }
  return { text: masked, open: inside, opened };
}

function insideComment(text: string, index: number): Step {
  const end = text.indexOf(COMMENT_END, index);
  const next = end === -1 ? text.length : end + COMMENT_END.length;
  return { piece: " ".repeat(next - index), next, inside: end === -1 };
}

function outsideComment(text: string, index: number): Step {
  const start = text.indexOf(COMMENT_START, index);
  if (start === -1) return { piece: text.slice(index), next: text.length, inside: false };
  const next = start + COMMENT_START.length;
  return {
    piece: `${text.slice(index, start)}${" ".repeat(COMMENT_START.length)}`,
    next,
    inside: true,
  };
}
