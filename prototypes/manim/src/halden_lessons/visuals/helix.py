"""A double helix seen from the side: two sinusoidal backbones with depth shading,
joined by base-pair rungs. `phase` turns it; `colour_mix` fades rungs from grey to base colours."""

import numpy as np
from manim import Line, VGroup

from halden_lessons.visuals.dna import COMPLEMENT
from halden_lessons.visuals.theme import BASE_COLORS, INK, MUTED

LENGTH = 11.0
AMPLITUDE = 1.1
TURN_LENGTH = 3.4
RUNG_SPACING = TURN_LENGTH / 10
GROOVE_OFFSET = 0.8 * np.pi
SEGMENTS = 160
SEQUENCE = "ATGGTGCATCTGACTCCTGAGGAGAAGTCTG"


def _y(x: np.ndarray, phase: float, offset: float) -> np.ndarray:
    return AMPLITUDE * np.sin(2 * np.pi * x / TURN_LENGTH + phase + offset)


def _depth(x: np.ndarray, phase: float, offset: float) -> np.ndarray:
    return np.cos(2 * np.pi * x / TURN_LENGTH + phase + offset)


def _backbone(phase: float, offset: float) -> VGroup:
    xs = np.linspace(-LENGTH / 2, LENGTH / 2, SEGMENTS)
    ys, zs = _y(xs, phase, offset), _depth(xs, phase, offset)
    pieces = VGroup()
    for i in range(SEGMENTS - 1):
        front = (zs[i] + 1) / 2
        pieces.add(
            Line(np.array([xs[i], ys[i], 0]), np.array([xs[i + 1], ys[i + 1], 0]), stroke_color=INK,
                 stroke_width=3 + 5 * front, stroke_opacity=0.25 + 0.75 * front)
        )  # fmt: skip
    return pieces


def _rung(x: float, phase: float, base: str, colour_mix: float) -> VGroup:
    top = np.array([x, _y(np.array(x), phase, 0.0), 0])
    bottom = np.array([x, _y(np.array(x), phase, GROOVE_OFFSET), 0])
    middle = (top + bottom) / 2
    front = float((_depth(np.array(x), phase, GROOVE_OFFSET / 2) + 1) / 2)
    opacity = 0.2 + 0.6 * front
    halves = VGroup(Line(top, middle), Line(middle, bottom))
    for half, letter in zip(halves, (base, COMPLEMENT[base]), strict=True):
        colour = BASE_COLORS[letter] if colour_mix > 0.5 else MUTED
        half.set_stroke(colour, width=6, opacity=opacity * max(colour_mix, 0.5))
    return halves


def double_helix(phase: float, colour_mix: float = 0.0) -> VGroup:
    xs = np.arange(-LENGTH / 2 + RUNG_SPACING / 2, LENGTH / 2, RUNG_SPACING)
    rungs = VGroup(
        *(_rung(x, phase, SEQUENCE[i % len(SEQUENCE)], colour_mix) for i, x in enumerate(xs))
    )
    return VGroup(rungs, _backbone(phase, 0.0), _backbone(phase, GROOVE_OFFSET))


def rung_count() -> int:
    return len(np.arange(-LENGTH / 2 + RUNG_SPACING / 2, LENGTH / 2, RUNG_SPACING))
