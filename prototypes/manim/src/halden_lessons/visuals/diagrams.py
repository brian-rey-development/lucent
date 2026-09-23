import random

import numpy as np
from manim import (
    DOWN,
    LEFT,
    RIGHT,
    UP,
    ArcBetweenPoints,
    Circle,
    Rectangle,
    Text,
    VGroup,
    VMobject,
)

from halden_lessons.visuals.theme import FONT, INK, MUTED

BALL_FILL = "#D6E05A"
BALL_EDGE = "#AEB83C"
THREAD_STEPS = 520
THREAD_STEP = 0.16
THREAD_SEED = 7


def tennis_ball(radius: float = 1.7) -> VGroup:
    ball = Circle(
        radius=radius, fill_color=BALL_FILL, fill_opacity=1, stroke_color=BALL_EDGE, stroke_width=4
    )
    left = ArcBetweenPoints(UP * radius + LEFT * 0.35, DOWN * radius + LEFT * 0.35, angle=-1.9)
    right = ArcBetweenPoints(UP * radius + RIGHT * 0.35, DOWN * radius + RIGHT * 0.35, angle=1.9)
    seams = VGroup(left, right).set_stroke("#FFFFFF", width=5, opacity=0.9)
    return VGroup(ball, seams)


def tangled_thread(radius: float, center: np.ndarray) -> VMobject:
    rng = random.Random(THREAD_SEED)
    point, heading, points = np.zeros(3), 0.0, []
    for _ in range(THREAD_STEPS):
        heading += rng.uniform(-0.9, 0.9)
        step = np.array([np.cos(heading), np.sin(heading), 0.0]) * THREAD_STEP
        candidate = point + step
        if np.linalg.norm(candidate) > radius:
            heading += np.pi
            candidate = point - step
        point = candidate
        points.append(center + point)
    thread = VMobject(stroke_color=INK, stroke_width=1.6, stroke_opacity=0.75)
    thread.set_points_smoothly(points)
    return thread


def proportion_bar(share: float, width: float = 11.0, height: float = 0.7) -> VGroup:
    major = Rectangle(
        width=width * share, height=height, fill_color="#C8463D", fill_opacity=1, stroke_width=0
    )
    minor = Rectangle(
        width=width * (1 - share),
        height=height,
        fill_color="#6C5B7B",
        fill_opacity=1,
        stroke_width=0,
    )
    minor.next_to(major, RIGHT, buff=0)
    bar = VGroup(major, minor).move_to(np.zeros(3))
    major_label = Text("red blood cells · no nucleus, no DNA", font=FONT, font_size=24, color=INK)
    minor_label = Text("everything else", font=FONT, font_size=24, color=MUTED)
    major_label.next_to(major, DOWN, buff=0.25).align_to(major, LEFT)
    minor_label.next_to(minor, DOWN, buff=0.25).align_to(minor, RIGHT)
    return VGroup(bar, major_label, minor_label)
