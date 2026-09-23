import textwrap
from dataclasses import dataclass

MAX_LINE_CHARS = 44
MS_PER_SECOND = 1000
SECONDS_PER_HOUR = 3600
SECONDS_PER_MINUTE = 60


@dataclass(frozen=True, slots=True)
class Cue:
    start: float
    end: float
    text: str


def _timestamp(seconds: float) -> str:
    total_ms = round(seconds * MS_PER_SECOND)
    total_s, ms = divmod(total_ms, MS_PER_SECOND)
    hours, rest = divmod(total_s, SECONDS_PER_HOUR)
    minutes, secs = divmod(rest, SECONDS_PER_MINUTE)
    return f"{hours:02}:{minutes:02}:{secs:02},{ms:03}"


def to_srt(cues: list[Cue]) -> str:
    blocks = [
        f"{index}\n{_timestamp(cue.start)} --> {_timestamp(cue.end)}\n"
        f"{textwrap.fill(cue.text, MAX_LINE_CHARS)}\n"
        for index, cue in enumerate(cues, start=1)
    ]
    return "\n".join(blocks)
