import re
from dataclasses import dataclass
from pathlib import Path

SEGMENT_HEADER = re.compile(r"^## (?P<id>[\w-]+)\s*$")
VISUAL_LINE = re.compile(r"^Visual:\s*(?P<text>.+)$")
EN_LINE = re.compile(r"^- EN:\s*(?P<text>.+)$")
ES_LINE = re.compile(r"^\s+ES:\s*(?P<text>.+)$")
PAUSE_LINE = re.compile(r"^- PAUSE:\s*(?P<seconds>[\d.]+)\s*$")


class ScriptFormatError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class Line:
    en: str
    es: str


@dataclass(frozen=True, slots=True)
class Pause:
    seconds: float


type Item = Line | Pause


@dataclass(frozen=True, slots=True)
class Segment:
    id: str
    visual: str
    items: tuple[Item, ...]


def load_script(path: Path) -> dict[str, Segment]:
    segments: dict[str, Segment] = {}
    for block in _split_segments(path.read_text(encoding="utf-8")):
        segment = _parse_segment(block)
        segments[segment.id] = segment
    return segments


def _split_segments(text: str) -> list[list[str]]:
    blocks: list[list[str]] = []
    for raw in text.splitlines():
        if SEGMENT_HEADER.match(raw):
            blocks.append([raw])
        elif blocks and raw.strip():
            blocks[-1].append(raw)
    return blocks


def _parse_segment(block: list[str]) -> Segment:
    header = SEGMENT_HEADER.match(block[0])
    if header is None:
        raise ScriptFormatError(f"expected a segment header, got {block[0]!r}")
    visual, items, pending_en = "", list[Item](), None
    for raw in block[1:]:
        if match := VISUAL_LINE.match(raw):
            visual = match["text"]
        elif match := EN_LINE.match(raw):
            pending_en = match["text"]
        elif (match := ES_LINE.match(raw)) and pending_en is not None:
            items.append(Line(en=pending_en, es=match["text"]))
            pending_en = None
        elif match := PAUSE_LINE.match(raw):
            items.append(Pause(seconds=float(match["seconds"])))
    if pending_en is not None:
        raise ScriptFormatError(f"segment {header['id']!r}: EN line without ES subtitle")
    return Segment(id=header["id"], visual=visual, items=tuple(items))
