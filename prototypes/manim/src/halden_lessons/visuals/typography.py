from manim import DOWN, LEFT, UP, Line, RoundedRectangle, Text, VGroup

from halden_lessons.visuals.theme import ACCENT, BACKGROUND, FONT, INK, MUTED, SOFT

TIMELINE_WIDTH = 9.6
TICK_HEIGHT = 0.18
TITLE_MAX_WIDTH = 12.0


def title_card(kicker: str, title: str) -> VGroup:
    top = Text(kicker.upper(), font=FONT, font_size=24, color=ACCENT, weight="BOLD")
    main = Text(title, font=FONT, font_size=64, color=INK, weight="BOLD")
    if main.width > TITLE_MAX_WIDTH:
        main.scale_to_fit_width(TITLE_MAX_WIDTH)
    rule = Line(LEFT * 0.8, LEFT * -0.8, stroke_color=ACCENT, stroke_width=4)
    return VGroup(top, main, rule).arrange(DOWN, buff=0.35)


def timeline(labels: list[str]) -> VGroup:
    axis = Line(
        LEFT * TIMELINE_WIDTH / 2, LEFT * -TIMELINE_WIDTH / 2, stroke_color=INK, stroke_width=3
    )
    step = TIMELINE_WIDTH / (len(labels) - 1)
    ticks, texts = VGroup(), VGroup()
    for index, label in enumerate(labels):
        x = axis.get_left() + LEFT * -index * step
        ticks.add(
            Line(x + DOWN * TICK_HEIGHT, x + UP * TICK_HEIGHT, stroke_color=INK, stroke_width=3)
        )
        texts.add(Text(label, font=FONT, font_size=24, color=MUTED).next_to(x, DOWN, buff=0.35))
    return VGroup(axis, ticks, texts)


def event_card(text: str, width: float = 2.7) -> VGroup:
    label = Text(text, font=FONT, font_size=24, color=INK, line_spacing=0.9)
    if label.width > width - 0.4:
        label.scale_to_fit_width(width - 0.4)
    card = RoundedRectangle(
        corner_radius=0.14,
        width=width,
        height=label.height + 0.5,
        fill_color=SOFT,
        fill_opacity=1,
        stroke_width=0,
    )
    return VGroup(card, label.move_to(card))


def stat_block(value: str, label: str, value_color: str = INK) -> VGroup:
    number = Text(value, font=FONT, font_size=56, color=value_color, weight="BOLD")
    caption = Text(label, font=FONT, font_size=24, color=MUTED)
    return VGroup(number, caption).arrange(DOWN, buff=0.15, aligned_edge=LEFT)


def paper_card(width: float, height: float) -> RoundedRectangle:
    return RoundedRectangle(
        corner_radius=0.16, width=width, height=height,
        fill_color=BACKGROUND, fill_opacity=0.94, stroke_width=0,
    )  # fmt: skip
