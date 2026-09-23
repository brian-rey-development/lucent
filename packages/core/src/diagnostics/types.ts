import type { Position } from "../text/index.ts";

export type Severity = "error" | "warning";

export type DiagnosticCode =
  | "E101"
  | "E102"
  | "E103"
  | "E104"
  | "E105"
  | "E106"
  | "E111"
  | "E112"
  | "E113"
  | "E120"
  | "E121"
  | "E122"
  | "E123"
  | "E124"
  | "E125"
  | "E126"
  | "E127"
  | "E128"
  | "E129"
  | "E130"
  | "E131"
  | "E132"
  | "E133"
  | "E134"
  | "E135"
  | "E136"
  | "E137"
  | "E138"
  | "E141"
  | "E201"
  | "E202"
  | "E203"
  | "E204"
  | "E205"
  | "E206"
  | "E207"
  | "E208"
  | "E209"
  | "W201"
  | "W401"
  | "W402"
  | "E501"
  | "W502";

export interface CodeDefinition {
  readonly severity: Severity;
  readonly summary: string;
}

export interface Problem {
  readonly code: DiagnosticCode;
  readonly message: string;
  readonly fix: string;
}

export interface Place {
  readonly where: string;
  readonly scene?: string | undefined;
  readonly file?: string | undefined;
}

export interface Location extends Place {
  readonly position: Position;
}

export interface Diagnostic extends Problem, Location {
  readonly severity: Severity;
}

export interface Result<T> {
  readonly value: T;
  readonly diagnostics: readonly Diagnostic[];
}
