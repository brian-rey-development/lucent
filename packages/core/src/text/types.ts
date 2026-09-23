export interface Position {
  readonly line: number;
  readonly column: number;
}

export interface TextBlock {
  readonly text: string;
  readonly firstLine: number;
}
