"""Real photographs as scene elements: framing, slow push-in, and annotations placed
in the image's own coordinates (u, v in 0..1 from the top-left corner)."""

from pathlib import Path

import numpy as np
from manim import (
    DL,
    DOWN,
    LEFT,
    RIGHT,
    UL,
    Circle,
    Group,
    ImageMobject,
    Mobject,
    RoundedRectangle,
    Text,
    VGroup,
    config,
)
from PIL import Image

from halden_lessons.visuals.theme import BACKGROUND, FONT, INK, MUTED

type Point = np.ndarray
CHIP_PADDING = 0.22
RING_HALO = "#1F2328"
RING_COLOR = "#FFFFFF"
MARGIN = 0.45


def load_photo(path: Path) -> ImageMobject:
    pixels = np.array(Image.open(path).convert("RGBA"))
    return ImageMobject(pixels)


def cover_frame(image: ImageMobject) -> ImageMobject:
    scale = max(config.frame_width / image.width, config.frame_height / image.height)
    return image.scale(scale).move_to(np.zeros(3))


def fit_height(image: ImageMobject, height: float) -> ImageMobject:
    return image.scale(height / image.height)


def point_on(image: ImageMobject, u: float, v: float) -> Point:
    return image.get_corner(UL) + RIGHT * u * image.width + DOWN * v * image.height


def ring(image: ImageMobject, u: float, v: float, radius: float) -> VGroup:
    center = point_on(image, u, v)
    halo = Circle(radius=radius, stroke_color=RING_HALO, stroke_width=10, stroke_opacity=0.35)
    line = Circle(radius=radius, stroke_color=RING_COLOR, stroke_width=5)
    return VGroup(halo.move_to(center), line.move_to(center))


def label_chip(text: str, font_size: int = 26, color: str = INK) -> VGroup:
    label = Text(text, font=FONT, font_size=font_size, color=color)
    card = RoundedRectangle(
        corner_radius=0.12,
        width=label.width + 2 * CHIP_PADDING,
        height=label.height + 1.6 * CHIP_PADDING,
        fill_color=BACKGROUND,
        fill_opacity=0.93,
        stroke_width=0,
    )
    return VGroup(card, label.move_to(card))


def caption_chip(caption: str, credit: str) -> VGroup:
    title = Text(caption, font=FONT, font_size=22, color=INK)
    source = Text(credit, font=FONT, font_size=15, color=MUTED)
    lines = VGroup(title, source).arrange(DOWN, aligned_edge=LEFT, buff=0.08)
    card = RoundedRectangle(
        corner_radius=0.1,
        width=lines.width + 2 * CHIP_PADDING,
        height=lines.height + 1.6 * CHIP_PADDING,
        fill_color=BACKGROUND,
        fill_opacity=0.9,
        stroke_width=0,
    )
    chip = VGroup(card, lines.move_to(card))
    return chip.to_corner(DL, buff=MARGIN)


def zoom_shift(center: Point, focus: Point, factor: float) -> Point:
    """Shift that, combined with scaling by `factor` about `center`, lands `focus` on the origin."""
    return (factor - 1) * center - factor * focus


def start_push_in(group: Group, focus: Point, rate: float = 0.018) -> None:
    def push(mob: Mobject, dt: float) -> None:
        mob.scale(1 + rate * dt, about_point=focus)

    group.add_updater(push)


def stop_motion(*mobjects: Mobject) -> None:
    for mob in mobjects:
        mob.clear_updaters()
