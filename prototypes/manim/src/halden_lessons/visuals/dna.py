from collections.abc import Iterable

from manim import DOWN, RIGHT, UP, Line, Mobject, RoundedRectangle, Text, VGroup

from halden_lessons.visuals.theme import BASE_COLORS, FONT, MUTED, SOFT

COMPLEMENT = {"A": "T", "T": "A", "G": "C", "C": "G", "N": "N"}
HYDROGEN_BONDS = {"A": 2, "T": 2, "G": 3, "C": 3}
TILE_SIZE = 0.8
TILE_GAP = 0.18
STRAND_GAP = 1.3
BOND_SPACING = 0.14


def base_tile(letter: str, size: float = TILE_SIZE) -> VGroup:
    box = RoundedRectangle(
        corner_radius=size * 0.18,
        width=size,
        height=size,
        fill_color=BASE_COLORS[letter],
        fill_opacity=1,
        stroke_width=0,
    )
    label = Text(letter, font=FONT, weight="BOLD", color="#FFFFFF", font_size=size * 44)
    return VGroup(box, label.move_to(box))


def blank_tile(size: float = TILE_SIZE, mark: str = "") -> VGroup:
    box = RoundedRectangle(
        corner_radius=size * 0.18,
        width=size,
        height=size,
        fill_color=SOFT,
        fill_opacity=1,
        stroke_color=MUTED,
        stroke_width=2,
    )
    label = Text(mark, font=FONT, weight="BOLD", color=MUTED, font_size=size * 40)
    return VGroup(box, label.move_to(box))


def strand(sequence: str, size: float = TILE_SIZE) -> VGroup:
    return VGroup(*(base_tile(b, size) for b in sequence)).arrange(buff=TILE_GAP)


def complement(sequence: str) -> str:
    return "".join(COMPLEMENT[b] for b in sequence)


def bonds_between(top: Iterable[Mobject], bottom: Iterable[Mobject], sequence: str) -> VGroup:
    groups = []
    for tile_top, tile_bottom, base in zip(top, bottom, sequence, strict=True):
        count = HYDROGEN_BONDS[base]
        offsets = [(i - (count - 1) / 2) * BOND_SPACING for i in range(count)]
        lines = [
            Line(tile_top.get_bottom(), tile_bottom.get_top(), color=MUTED, stroke_width=3)
            .scale(0.7)
            .shift(RIGHT * offset)
            for offset in offsets
        ]
        groups.append(VGroup(*lines))
    return VGroup(*groups)


def place_below(bottom: VGroup, top: VGroup) -> VGroup:
    return bottom.next_to(top, DOWN, buff=STRAND_GAP)


def place_above(top: VGroup, bottom: VGroup) -> VGroup:
    return top.next_to(bottom, UP, buff=STRAND_GAP)
