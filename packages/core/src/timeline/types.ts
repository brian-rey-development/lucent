export interface TimelineCue {
  readonly phrase: string;
  readonly id: string | undefined;
  readonly time: number;
}

export interface SceneTimeline {
  readonly id: string;
  readonly start: number;
  readonly duration: number;
  readonly cues: readonly TimelineCue[];
}

export interface Timeline {
  readonly duration: number;
  readonly scenes: readonly SceneTimeline[];
}
