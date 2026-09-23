from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import ClassVar

from manim import FadeOut, Mobject, Scene, ValueTracker, config

from halden_lessons.narration.script import Line, Pause, Segment, load_script
from halden_lessons.narration.voice import duration_seconds, synthesize
from halden_lessons.subtitles.srt import Cue, to_srt
from halden_lessons.visuals.theme import apply_theme

LINE_GAP = 0.4
SEGMENT_TAIL = 0.7

apply_theme()


@dataclass(frozen=True, slots=True)
class Narration:
    scene: "NarratedScene"
    start: float
    duration: float
    line_starts: tuple[float, ...]
    line_lengths: tuple[float, ...]

    def wait_for_line(self, index: int, fraction: float = 0.0) -> None:
        offset = self.line_starts[index] + fraction * self.line_lengths[index]
        self.scene.wait_until_time(self.start + offset)

    def until_end(self) -> float:
        return max(0.0, self.start + self.duration - self.scene.renderer.time)


class NarratedScene(Scene):
    script_path: ClassVar[Path]

    def setup(self) -> None:
        self.script: dict[str, Segment] = load_script(self.script_path)
        self.cues: dict[str, list[Cue]] = {"en": [], "es": []}
        self.audio_cache = Path(config.media_dir) / "voice"

    def wait_until_time(self, moment: float) -> None:
        delay = moment - self.renderer.time
        if delay > 1 / config.frame_rate:
            self.wait(delay)

    @contextmanager
    def narrate(self, segment_id: str) -> Iterator[Narration]:
        narration = self._schedule(self.script[segment_id])
        yield narration
        self.wait_until_time(narration.start + narration.duration + SEGMENT_TAIL)

    def clear_stage(self, keep: tuple[Mobject, ...] = (), run_time: float = 0.8) -> None:
        stage = [m for m in self.mobjects if m not in keep and not isinstance(m, ValueTracker)]
        if stage:
            self.play(*(FadeOut(m) for m in stage), run_time=run_time)

    def tear_down(self) -> None:
        episode = self.script_path.parent.name
        out_dir = Path(config.media_dir) / "subtitles"
        out_dir.mkdir(parents=True, exist_ok=True)
        for language, cues in self.cues.items():
            (out_dir / f"{episode}.{language}.srt").write_text(to_srt(cues), encoding="utf-8")

    def _schedule(self, segment: Segment) -> Narration:
        start, offset = self.renderer.time, 0.0
        starts, lengths = list[float](), list[float]()
        for item in segment.items:
            if isinstance(item, Pause):
                offset += item.seconds
                continue
            offset = self._schedule_line(item, start, offset, starts)
            lengths.append(offset - starts[-1] - LINE_GAP)
        return Narration(self, start, offset, tuple(starts), tuple(lengths))

    def _schedule_line(self, line: Line, start: float, offset: float, starts: list[float]) -> float:
        clip = synthesize(line.en, self.audio_cache)
        length = duration_seconds(clip)
        self.add_sound(str(clip), time_offset=offset)
        begin, end = start + offset, start + offset + length
        self.cues["en"].append(Cue(begin, end, line.en))
        self.cues["es"].append(Cue(begin, end, line.es))
        starts.append(offset)
        return offset + length + LINE_GAP
