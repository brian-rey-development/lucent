import json
from pathlib import Path

import numpy as np
from manim import (
    DOWN,
    LEFT,
    ORIGIN,
    RIGHT,
    UP,
    Arrow,
    Circle,
    Create,
    Cross,
    DoubleArrow,
    Ellipse,
    FadeIn,
    FadeOut,
    Group,
    GrowArrow,
    GrowFromEdge,
    ImageMobject,
    LaggedStart,
    Line,
    Rectangle,
    Text,
    Transform,
    VGroup,
    Write,
    smooth,
)

from halden_lessons.narration.scene import NarratedScene
from halden_lessons.visuals.dna import base_tile, blank_tile, bonds_between, complement
from halden_lessons.visuals.photo import (
    caption_chip,
    cover_frame,
    fit_height,
    label_chip,
    load_photo,
    point_on,
    start_push_in,
    stop_motion,
    zoom_shift,
)
from halden_lessons.visuals.theme import ACCENT, BASE_COLORS, FONT, INK, MONO, MUTED, SOFT
from halden_lessons.visuals.typography import event_card, title_card

HERE = Path(__file__).parent
ASSETS = HERE.parents[1] / "assets"
CREDITS = {r["key"]: r for r in json.loads((ASSETS / "credits.json").read_text())}

ZOOM_THROUGH = 3.2
CHARGAFF_HEIGHT = 4.2


def credit_line(key: str) -> str:
    record = CREDITS[key]
    artist = str(record["artist"]).removeprefix("Courtesy: ")
    half = len(artist) // 2
    if half and artist[:half] == artist[half:]:
        artist = artist[:half]
    if artist.strip().lower() in ("", "unknown", "unknown author"):
        return str(record["license"])
    return f"{artist} · {record['license']}"


class Lesson(NarratedScene):
    script_path = HERE / "script.md"

    def construct(self) -> None:
        self.episode_title()
        self.griffith()
        self.avery()
        self.disbelief()
        self.hershey()
        self.chargaff()
        self.pairing()
        self.why_two()
        self.credits()

    # Photos ---------------------------------------------------------------

    def show_photo(
        self, key: str, focus: tuple[float, float], rate: float
    ) -> tuple[Group, ImageMobject]:
        image = cover_frame(load_photo(ASSETS / "images" / CREDITS[key]["path"]))
        group = Group(image)
        self.chip = caption_chip(str(CREDITS[key]["caption"]), credit_line(key))
        self.play(FadeIn(group, scale=0.88), FadeIn(self.chip, shift=UP * 0.15), run_time=1.2)
        start_push_in(group, point_on(image, *focus), rate)
        return group, image

    def show_portrait(self, key: str, height: float = 5.4) -> Group:
        image = fit_height(load_photo(ASSETS / "images" / CREDITS[key]["path"]), height)
        group = Group(image).move_to(UP * 0.3)
        self.chip = caption_chip(str(CREDITS[key]["caption"]), credit_line(key))
        self.play(FadeIn(group, shift=UP * 0.15), FadeIn(self.chip, shift=UP * 0.1), run_time=1.2)
        return group

    def leave_portrait(self, group: Group, run_time: float = 1.0) -> None:
        self.play(FadeOut(group), FadeOut(self.chip), run_time=run_time, rate_func=smooth)

    def leave_photo(self, group: Group, toward: np.ndarray, run_time: float = 1.2) -> None:
        stop_motion(group)
        shift = zoom_shift(group.get_center(), toward, ZOOM_THROUGH)
        self.play(
            FadeOut(group, scale=ZOOM_THROUGH, shift=shift),
            FadeOut(self.chip),
            run_time=run_time,
            rate_func=smooth,
        )

    def annotate(
        self, group: Group, mark: VGroup | None, note: VGroup | None = None, run_time: float = 0.9
    ) -> None:
        animations = []
        if mark is not None:
            group.add(mark)
            animations.append(Create(mark))
        if note is not None:
            group.add(note)
            animations.append(FadeIn(note, shift=UP * 0.1))
        self.play(*animations, run_time=run_time)

    # Title ----------------------------------------------------------------

    def episode_title(self) -> None:
        with self.narrate("recap") as n:
            doubt = Text("Proteins have 20 units. DNA has 4. Why DNA?", font=FONT, font_size=34)
            self.play(Write(doubt), run_time=1.2)
            n.wait_for_line(1)
            self.play(FadeOut(doubt), run_time=0.6)
            card = title_card("Episode 2", "The experiment that settled it")
            self.play(FadeIn(card, shift=UP * 0.2), run_time=1.0)
        self.wait(1.2)
        self.clear_stage()

    # Griffith ---------------------------------------------------------------

    def griffith(self) -> None:
        with self.narrate("griffith") as n:
            group, image = self.show_photo("pneumo", (0.5, 0.45), rate=0.012)
            n.wait_for_line(1)
            self.leave_photo(group, point_on(image, 0.5, 0.45))
            grid = self._griffith_grid()
            self.play(FadeIn(grid), run_time=1.0)
            n.wait_for_line(2)
            self.play(FadeIn(grid[0][2], shift=UP * 0.1), run_time=0.7)
            self.play(FadeIn(grid[1][2], shift=UP * 0.1), run_time=0.7)
            n.wait_for_line(3)
            self.play(FadeIn(grid[2][2], shift=UP * 0.1), run_time=0.7)
            self.play(FadeIn(grid[3][2], shift=UP * 0.1), run_time=0.7)
        self.clear_stage()

    def _griffith_grid(self) -> VGroup:
        cells = [
            ("smooth · alive", "mouse dies"),
            ("rough · alive", "mouse lives"),
            ("smooth · heat-killed", "mouse lives"),
            ("killed smooth +\nlive rough", "mouse dies ·\nsmooth recovered"),
        ]
        markers = ("smooth", "rough", "dead", "mixed")
        cards = VGroup()
        for (title, outcome), kind in zip(cells, markers, strict=True):
            box = Rectangle(
                width=5.6, height=2.5, stroke_color=MUTED, stroke_width=2, fill_opacity=0
            )
            center = box.get_center()
            head = Text(title, font=FONT, font_size=22, weight="BOLD").move_to(center + UP * 0.75)
            result = Text(outcome, font=FONT, font_size=22, color=ACCENT).move_to(
                center + DOWN * 0.7
            )
            result.set_opacity(0)
            marker = self._bacteria_marker(kind).move_to(center + DOWN * 0.05)
            cards.add(VGroup(box, head, result, marker))
        return cards.arrange_in_grid(rows=2, cols=2, buff=0.5).move_to(ORIGIN)

    def _bacteria_marker(self, kind: str) -> VGroup:
        if kind == "rough":
            return VGroup(Circle(radius=0.16, fill_color=INK, fill_opacity=1, stroke_width=0))
        if kind == "dead":
            cross = Cross(scale_factor=0.35, stroke_color=MUTED, stroke_width=6)
            return VGroup(
                Circle(radius=0.16, stroke_color=MUTED, stroke_width=4), cross.move_to(ORIGIN)
            )
        if kind == "mixed":
            return VGroup(
                Circle(radius=0.16, stroke_color=MUTED, stroke_width=4),
                Circle(radius=0.16, fill_color=INK, fill_opacity=1, stroke_width=0).shift(
                    RIGHT * 0.45
                ),
            )
        return VGroup(Circle(radius=0.16, stroke_color=ACCENT, stroke_width=4))

    # Avery ------------------------------------------------------------------

    def avery(self) -> None:
        with self.narrate("avery") as n:
            group = self.show_portrait("avery")
            n.wait_for_line(1)
            self.leave_portrait(group)
            tubes = self._tubes()
            self.play(FadeIn(tubes), run_time=1.0)
            n.wait_for_line(2)
            self.play(
                LaggedStart(*(FadeIn(t[2], shift=UP * 0.1) for t in tubes[:4]), lag_ratio=0.4),
                run_time=2.2,
            )
            n.wait_for_line(3)
            self.play(FadeIn(tubes[4][2], shift=UP * 0.1), run_time=0.9)
            self.play(FadeIn(tubes[4][3], shift=UP * 0.1), run_time=0.9)
        self.clear_stage()

    def _tubes(self) -> VGroup:
        labels = ["destroy\nproteins", "destroy\nRNA", "destroy\nfats, sugars", "destroy\nDNA"]
        tubes = VGroup()
        for label in labels:
            body = Rectangle(width=0.9, height=2.2, stroke_color=INK, stroke_width=3)
            tag = Text(label, font=FONT, font_size=20).next_to(body, DOWN, buff=0.2)
            verdict = Text("still transforms", font=FONT, font_size=20, color=ACCENT)
            verdict.next_to(body, UP, buff=0.2)
            verdict.set_opacity(0)
            tubes.add(VGroup(body, tag, verdict))
        pure_body = Rectangle(width=0.9, height=2.2, stroke_color=ACCENT, stroke_width=4)
        pure_tag = Text("pure DNA\nonly", font=FONT, font_size=20, weight="BOLD")
        pure_tag.next_to(pure_body, DOWN, buff=0.2)
        pure_verdict = Text("still transforms", font=FONT, font_size=20, color=ACCENT)
        pure_verdict.next_to(pure_body, UP, buff=0.2)
        pure_verdict.set_opacity(0)
        pure_note = Text("nothing else in the tube", font=FONT, font_size=18, color=MUTED)
        pure_note.next_to(pure_verdict, UP, buff=0.15)
        pure_note.set_opacity(0)
        tubes.add(VGroup(pure_body, pure_tag, pure_verdict, pure_note))
        tubes.arrange(RIGHT, buff=0.7).move_to(DOWN * 0.2)
        tubes[3][2].become(
            Text("STOPS", font=FONT, font_size=22, color=ACCENT, weight="BOLD").move_to(
                tubes[3][2].get_center()
            )
        )
        return tubes

    # Disbelief ----------------------------------------------------------------

    def disbelief(self) -> None:
        with self.narrate("disbelief") as n:
            simple = event_card("DNA looks\ntoo simple")
            strong = event_card("proteins look\npowerful")
            VGroup(simple, strong).arrange(RIGHT, buff=1.2).move_to(UP * 0.5)
            self.play(FadeIn(simple, shift=UP * 0.2), run_time=0.8)
            self.play(FadeIn(strong, shift=UP * 0.2), run_time=0.8)
            n.wait_for_line(1)
            years = Text("1944 ──── 1952", font=MONO, font_size=36, color=MUTED)
            years.next_to(VGroup(simple, strong), DOWN, buff=0.8)
            self.play(FadeIn(years, shift=RIGHT * 0.3), run_time=1.0)
        self.clear_stage()

    # Hershey-Chase ------------------------------------------------------------

    def hershey(self) -> None:
        with self.narrate("hershey") as n:
            group, image = self.show_photo("phage", (0.5, 0.5), rate=0.004)
            n.wait_for_line(1)
            self.leave_photo(group, point_on(image, 0.5, 0.5))
            base, dna_arrow, inside, outside = self._blender_diagram()
            self.play(FadeIn(base), run_time=1.0)
            n.wait_for_line(2)
            self.play(GrowArrow(dna_arrow), run_time=1.0)
            self.play(FadeIn(inside, shift=UP * 0.1), run_time=0.8)
            n.wait_for_line(3)
            self.play(FadeIn(outside, shift=UP * 0.1), run_time=0.8)
        self.clear_stage()

    def _blender_diagram(self) -> tuple[VGroup, Arrow, Text, Text]:
        cell = Ellipse(width=4.2, height=2.4, stroke_color=INK, stroke_width=4)
        cell.move_to(LEFT * 2.5)
        head = Circle(radius=0.45, stroke_color=INK, stroke_width=4, fill_opacity=0)
        head.next_to(cell, UP, buff=0.9).shift(RIGHT * 0.4)
        leg_left = Line(
            head.get_bottom() + LEFT * 0.18, cell.get_top() + LEFT * 0.35, color=INK,
            stroke_width=5,
        )  # fmt: skip
        leg_right = Line(
            head.get_bottom() + RIGHT * 0.18, cell.get_top() + RIGHT * 0.35, color=INK,
            stroke_width=5,
        )  # fmt: skip
        virus_tag = Text("virus", font=FONT, font_size=22, color=MUTED)
        virus_tag.next_to(head, RIGHT, buff=0.25)
        cell_tag = Text("bacterium", font=FONT, font_size=22, color=MUTED)
        cell_tag.move_to(cell.get_center())
        dna_arrow = Arrow(
            head.get_bottom(), cell.get_center(), buff=0.1, color=ACCENT, stroke_width=6
        )
        inside = Text("DNA inside (32P)", font=FONT, font_size=24, color=ACCENT)
        inside.next_to(cell, DOWN, buff=0.35)
        outside = Text("coats outside (35S)", font=FONT, font_size=24, color=MUTED)
        outside.next_to(head, UP, buff=0.3)
        base = VGroup(cell, cell_tag, head, virus_tag, leg_left, leg_right)
        return base, dna_arrow, inside, outside

    # Chargaff -----------------------------------------------------------------

    def chargaff(self) -> None:
        with self.narrate("chargaff") as m:
            doc = self._chargaff_doc()
            self.play(FadeIn(doc, shift=UP * 0.2), run_time=1.0)
            m.wait_for_line(1)
            prompt = label_chip("look for the pattern first").to_edge(UP, buff=0.5)
            self.play(FadeIn(prompt, shift=DOWN * 0.15), run_time=0.8)
            m.wait_for_line(2)
            self.play(FadeOut(doc), FadeOut(prompt), run_time=0.7)
            bars, tags = self._chargaff_bars()
            self.play(
                LaggedStart(*(GrowFromEdge(b, DOWN) for b in bars), lag_ratio=0.35),
                LaggedStart(*(FadeIn(t) for t in tags), lag_ratio=0.35),
                run_time=2.6,
            )
            m.wait_for_line(3)
            verdict = Text("A = T   ·   G = C", font=MONO, font_size=44, weight="BOLD")
            verdict.to_edge(DOWN, buff=0.7)
            self.play(FadeIn(verdict, shift=UP * 0.15), run_time=0.9)
        self.clear_stage()

    def _chargaff_doc(self) -> Group:
        path = ASSETS / "images" / CREDITS["chargaff"]["path"]
        image = fit_height(load_photo(path), CHARGAFF_HEIGHT)
        backing = Rectangle(
            width=image.width + 0.5, height=image.height + 0.5,
            fill_color="#FFFFFF", fill_opacity=1, stroke_color=SOFT, stroke_width=2,
        )  # fmt: skip
        doc = Group(backing, image).move_to(DOWN * 0.2)
        chip = caption_chip(str(CREDITS["chargaff"]["caption"]), credit_line("chargaff"))
        return Group(doc, chip)

    def _chargaff_bars(self) -> tuple[VGroup, VGroup]:
        values = [
            ("A", 0.309, BASE_COLORS["A"]),
            ("T", 0.294, BASE_COLORS["T"]),
            ("G", 0.199, BASE_COLORS["G"]),
            ("C", 0.198, BASE_COLORS["C"]),
        ]
        bars, tags = VGroup(), VGroup()
        for letter, share, colour in values:
            bar = Rectangle(
                width=1.5, height=share * 14, fill_color=colour, fill_opacity=1, stroke_width=0
            ).align_to(ORIGIN, DOWN)
            tag = Text(f"{letter} {share:.1%}", font=MONO, font_size=30)
            tag.next_to(bar, UP, buff=0.2)
            bars.add(bar)
            tags.add(tag)
        bars.arrange(RIGHT, buff=0.8, aligned_edge=DOWN).move_to(DOWN * 0.3)
        for bar, tag in zip(bars, tags, strict=True):
            tag.move_to(bar.get_top() + UP * 0.35)
        return bars, tags

    # Pairing ------------------------------------------------------------------

    def pairing(self) -> None:
        with self.narrate("pairing") as n:
            top = VGroup(*(base_tile(b, 0.85) for b in "ATGC")).arrange(RIGHT, buff=0.2)
            top.move_to(UP * 1.4)
            self.play(FadeIn(top, shift=DOWN * 0.15), run_time=0.9)
            blanks = VGroup(*(blank_tile(0.85, "?") for _ in "ATGC")).arrange(RIGHT, buff=0.2)
            blanks.next_to(top, DOWN, buff=1.3)
            self.play(FadeIn(blanks), run_time=0.8)
            n.wait_for_line(1)
            bottom = VGroup(*(base_tile(b, 0.85) for b in complement("ATGC"))).arrange(
                RIGHT, buff=0.2
            )
            bottom.move_to(blanks.get_center())
            self.play(Transform(blanks, bottom), run_time=1.4)
            n.wait_for_line(1, fraction=0.6)
            bonds = bonds_between(top, blanks, "ATGC")
            counts = VGroup(
                Text("2 bonds", font=FONT, font_size=22, color=MUTED),
                Text("2 bonds", font=FONT, font_size=22, color=MUTED),
                Text("3 bonds", font=FONT, font_size=22, color=MUTED),
                Text("3 bonds", font=FONT, font_size=22, color=MUTED),
            )
            for bond_group, label in zip(bonds, counts, strict=True):
                label.next_to(bond_group.get_center(), RIGHT, buff=2.6)
            self.play(Create(bonds), FadeIn(counts, shift=LEFT * 0.15), run_time=1.4)
            n.wait_for_line(2)
            self.play(FadeOut(bonds), FadeOut(counts), run_time=0.6)
            arrows = self._direction_arrows(top, blanks)
            self.play(FadeIn(arrows, shift=UP * 0.1), run_time=0.9)
            n.wait_for_line(3)
            flipped = Text("reverse complement of ATGC is GCAT", font=MONO, font_size=32)
            flipped.to_edge(DOWN, buff=0.6)
            self.play(FadeIn(flipped, shift=UP * 0.15), run_time=1.0)
        self.clear_stage()

    def _direction_arrows(self, top: VGroup, bottom: VGroup) -> VGroup:
        up_arrow = DoubleArrow(
            top.get_left() + UP * 0.7, top.get_right() + UP * 0.7, buff=0, color=INK
        )
        low_arrow = DoubleArrow(
            bottom.get_right() + DOWN * 0.7, bottom.get_left() + DOWN * 0.7, buff=0, color=INK
        )
        five_top = Text("5'", font=MONO, font_size=24, color=MUTED).next_to(up_arrow, LEFT)
        three_top = Text("3'", font=MONO, font_size=24, color=MUTED).next_to(up_arrow, RIGHT)
        five_bot = Text("5'", font=MONO, font_size=24, color=MUTED).next_to(low_arrow, RIGHT)
        three_bot = Text("3'", font=MONO, font_size=24, color=MUTED).next_to(low_arrow, LEFT)
        return VGroup(up_arrow, low_arrow, five_top, three_top, five_bot, three_bot)

    # Why two ------------------------------------------------------------------

    def why_two(self) -> None:
        with self.narrate("why-two") as n:
            pair = VGroup(
                VGroup(*(base_tile(b, 0.7) for b in "ATGC")).arrange(RIGHT, buff=0.15),
                VGroup(*(base_tile(b, 0.7) for b in complement("ATGC"))).arrange(RIGHT, buff=0.15),
            ).arrange(DOWN, buff=0.6)
            pair.move_to(UP * 0.6)
            self.play(FadeIn(pair, shift=DOWN * 0.15), run_time=0.9)
            n.wait_for_line(1, fraction=0.35)
            copy = pair.copy().shift(DOWN * 2.6 + RIGHT * 0.3).scale(0.8)
            self.play(FadeIn(copy, shift=UP * 0.15), run_time=1.2)
            broken = Cross(pair[0][1], stroke_color=ACCENT, stroke_width=6).scale(1.4)
            self.play(Create(broken), run_time=0.7)
            self.play(FadeOut(broken), run_time=0.6)
            n.wait_for_line(1)
            self.clear_stage(run_time=0.7)
            closing = title_card("Next", "How four letters encode twenty · genes")
            self.play(FadeIn(closing, shift=UP * 0.2), run_time=1.0)
        self.wait(1.5)
        self.clear_stage()

    def credits(self) -> None:
        heading = Text("Images", font=FONT, font_size=28, weight="BOLD")
        rows = VGroup(
            *(
                Text(f"{r['caption']}  ·  {credit_line(k)}", font=FONT, font_size=14, color=MUTED)
                for k, r in CREDITS.items()
                if k in ("pneumo", "avery", "phage", "chargaff")
            )
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.14)
        voice = Text(
            "Narration: Kokoro-82M (am_fenrir) · Animation: Manim Community",
            font=FONT,
            font_size=14,
            color=MUTED,
        )
        block = (
            VGroup(heading, rows, voice).arrange(DOWN, aligned_edge=LEFT, buff=0.35).move_to(ORIGIN)
        )
        self.play(FadeIn(block), run_time=1.0)
        self.wait(4.0)
        self.play(FadeOut(block), run_time=1.0)
