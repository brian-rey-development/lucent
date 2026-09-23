"""An illustrative variant file: realistic columns and coordinates, synthetic content."""

import random

import numpy as np
from manim import DOWN, LEFT, Rectangle, Text, VGroup

from halden_lessons.visuals.theme import BACKGROUND, INK, MONO, MUTED

CHROMOSOMES = [f"chr{i}" for i in range(1, 23)] + ["chrX"]
BASES = "ACGT"
GENOTYPES = ("0/1", "0/1", "0/1", "1/1")
HEADER = "#CHROM   POS          REF  ALT  GT"
LINE_SIZE = 26
LINE_SPACING = 0.42
SEED = 20260922


def _variant_line(rng: random.Random) -> str:
    chrom = rng.choice(CHROMOSOMES)
    pos = rng.randrange(1_000_000, 240_000_000)
    ref = rng.choice(BASES)
    alt = rng.choice([b for b in BASES if b != ref])
    return f"{chrom:<8} {pos:<12} {ref:<4} {alt:<4} {rng.choice(GENOTYPES)}"


def variant_lines(count: int, highlight: str, highlight_at: int) -> list[str]:
    rng = random.Random(SEED)
    lines = [_variant_line(rng) for _ in range(count)]
    lines[highlight_at] = highlight
    return lines


def text_column(lines: list[str]) -> VGroup:
    rows = VGroup(*(Text(line, font=MONO, font_size=LINE_SIZE, color=INK) for line in lines))
    rows.arrange(DOWN, aligned_edge=LEFT, buff=LINE_SPACING - rows[0].height)
    return rows


def header_row() -> Text:
    return Text(HEADER, font=MONO, font_size=LINE_SIZE, color=MUTED, weight="BOLD")


def window_masks(window_top: float, window_bottom: float, width: float = 16.0) -> VGroup:
    above = Rectangle(width=width, height=6, fill_color=BACKGROUND, fill_opacity=1, stroke_width=0)
    below = above.copy()
    above.move_to(np.array([0, window_top + 3, 0]))
    below.move_to(np.array([0, window_bottom - 3, 0]))
    masks = VGroup(above, below)
    masks.set_z_index(10)
    return masks


def align_left(group: VGroup, x: float) -> VGroup:
    return group.shift(LEFT * (group.get_left()[0] - x))
