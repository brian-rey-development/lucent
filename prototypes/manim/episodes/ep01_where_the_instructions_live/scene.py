import json
from pathlib import Path

import numpy as np
from manim import (
    DL,
    DOWN,
    DR,
    LEFT,
    ORIGIN,
    RIGHT,
    UP,
    Arrow,
    Circle,
    Create,
    Dot,
    DoubleArrow,
    Ellipse,
    FadeIn,
    FadeOut,
    Group,
    GrowArrow,
    GrowFromEdge,
    ImageMobject,
    LaggedStart,
    Rectangle,
    RoundedRectangle,
    Text,
    Transform,
    ValueTracker,
    VGroup,
    VMobject,
    Write,
    always_redraw,
    config,
    linear,
    rush_from,
    smooth,
)

from halden_lessons.narration.scene import NarratedScene, Narration
from halden_lessons.visuals.diagrams import proportion_bar, tangled_thread, tennis_ball
from halden_lessons.visuals.dna import base_tile
from halden_lessons.visuals.helix import SEQUENCE, double_helix
from halden_lessons.visuals.photo import (
    caption_chip,
    cover_frame,
    fit_height,
    label_chip,
    load_photo,
    point_on,
    ring,
    start_push_in,
    stop_motion,
    zoom_shift,
)
from halden_lessons.visuals.theme import (
    ACCENT,
    BASE_COLORS,
    DNA_COLOR,
    FATHER,
    FONT,
    INK,
    MONO,
    MOTHER,
    MUTED,
    SOFT,
)
from halden_lessons.visuals.typography import (
    event_card,
    stat_block,
    timeline,
    title_card,
)
from halden_lessons.visuals.vcf import header_row, text_column, variant_lines, window_masks

HERE = Path(__file__).parent
ASSETS = HERE.parents[1] / "assets"
CREDITS = {r["key"]: r for r in json.loads((ASSETS / "credits.json").read_text())}

MAYA_LINE = "chr2     166011234    C    T    0/1"
VCF_LINES = 64
MAYA_LINE_AT = 57
WINDOW_TOP, WINDOW_BOTTOM = 2.15, -2.55
KARYOTYPE_HEIGHT = 6.0
ZOOM_THROUGH = 3.2
INTO_CHROMOSOME = 9.0
# Pair label positions on the NHGRI karyotype: label rows at height v, pairs at u (image coords).
KARYOTYPE_ROWS: dict[float, list[tuple[str, float]]] = {
    0.245: [("1", 0.08), ("2", 0.215), ("3", 0.36), ("4", 0.705), ("5", 0.85)],
    0.46: [
        ("6", 0.075),
        ("7", 0.22),
        ("8", 0.36),
        ("9", 0.495),
        ("10", 0.64),
        ("11", 0.78),
        ("12", 0.925),
    ],
    0.705: [
        ("13", 0.075),
        ("14", 0.225),
        ("15", 0.355),
        ("16", 0.635),
        ("17", 0.78),
        ("18", 0.925),
    ],
    0.93: [("19", 0.22), ("20", 0.355), ("21", 0.64), ("22", 0.785), ("X  Y", 0.925)],
}
KARYOTYPE_LABELS = [(label, u, v) for v, row in KARYOTYPE_ROWS.items() for label, u in row]


def credit_line(key: str) -> str:
    record = CREDITS[key]
    artist = str(record["artist"]).removeprefix("Courtesy: ")
    return f"{artist} · {record['license']}"


class Lesson(NarratedScene):
    script_path = HERE / "script.md"

    def construct(self) -> None:
        self.maya()
        self.sequencer()
        self.variant_file()
        self.episode_title()
        self.skin()
        self.nucleus()
        self.scale_up()
        self.blood()
        self.chromosomes()
        self.molecule()
        self.doubt()
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

    # Act 1: the case ------------------------------------------------------------

    def maya(self) -> None:
        name = Text("Maya, 4", font=FONT, font_size=64, weight="BOLD").to_edge(UP, buff=0.9)
        line = timeline(["age 1", "age 2", "age 3", "age 4"]).shift(DOWN * 0.9)
        ticks = line[1]
        with self.narrate("maya") as n:
            self.play(Write(name), run_time=1.2)
            n.wait_for_line(1)
            self.play(Create(line[0]), FadeIn(ticks), FadeIn(line[2]), run_time=1.0)
            self._seizures(line)
            n.wait_for_line(2)
            cards = self._milestones(ticks)
            n.wait_for_line(3)
            self._odyssey(line, cards)
        self.clear_stage()

    def _seizures(self, line: VGroup) -> None:
        first = event_card("first seizure").next_to(line[1][0], UP, buff=0.9)
        self.play(FadeIn(first, shift=DOWN * 0.2), run_time=0.7)
        start, end = line[1][0].get_center()[0], line[1][3].get_center()[0]
        xs = np.sort(np.random.default_rng(4).uniform(start, end, 38))
        dots = VGroup(
            *(Dot(np.array([x, line[0].get_y() + 0.42, 0]), radius=0.055, color=ACCENT) for x in xs)
        )
        self.play(LaggedStart(*(FadeIn(d, scale=2) for d in dots), lag_ratio=0.12), run_time=3.2)
        self.first_card = first

    def _milestones(self, ticks: VMobject) -> VGroup:
        cards = VGroup(
            event_card("walked late").next_to(ticks[1], UP, buff=0.9),
            event_card("spoke late").next_to(ticks[2], UP, buff=0.9),
            event_card("3 specialists\nno diagnosis").next_to(ticks[3], UP, buff=0.9),
        )
        for card in cards:
            self.play(FadeIn(card, shift=DOWN * 0.2), run_time=0.8)
            self.wait(0.6)
        return cards

    def _odyssey(self, line: VGroup, cards: VGroup) -> None:
        self.play(
            cards.animate.set_opacity(0.35), self.first_card.animate.set_opacity(0.35), run_time=0.6
        )
        arrow_start = line[0].get_left() + DOWN * 1.35
        journey = Arrow(arrow_start, arrow_start + RIGHT * 14, buff=0, color=ACCENT, stroke_width=5)
        label = Text(
            "diagnostic odyssey: often years, sometimes forever",
            font=FONT,
            font_size=28,
            color=ACCENT,
        )
        label.next_to(journey, DOWN, buff=0.25).align_to(line[0], LEFT)
        self.play(GrowArrow(journey), run_time=1.6)
        self.play(FadeIn(label, shift=UP * 0.1), run_time=0.8)

    def sequencer(self) -> None:
        with self.narrate("test") as n:
            group, image = self.show_photo("sequencer", (0.5, 0.55), rate=0.02)
            n.wait_for_line(1)
            self.leave_photo(group, point_on(image, 0.55, 0.28))

    def variant_file(self) -> None:
        rows = text_column(variant_lines(VCF_LINES, MAYA_LINE, MAYA_LINE_AT))
        rows.next_to(np.array([-5.6, WINDOW_TOP - 0.25, 0]), DOWN, aligned_edge=LEFT, buff=0)
        header = header_row().move_to(np.array([0, WINDOW_TOP + 0.45, 0])).align_to(rows, LEFT)
        header.set_z_index(11)
        count = ValueTracker(0)
        counter = always_redraw(lambda: self._counter(count.get_value()))
        target = rows[MAYA_LINE_AT]
        with self.narrate("file") as n:
            self.add(rows, window_masks(WINDOW_TOP, WINDOW_BOTTOM))
            self.play(FadeIn(header), FadeIn(counter), run_time=0.6)
            scroll = UP * (WINDOW_BOTTOM + 1.2 - target.get_y())
            self.play(
                rows.animate.shift(scroll),
                count.animate.set_value(24_873),
                run_time=5.5,
                rate_func=rush_from,
            )
            n.wait_for_line(1)
            self.play(*(r.animate.set_color(MUTED) for r in rows), run_time=0.8)
            n.wait_for_line(2)
            self._single_out(rows, target)
            n.wait_for_line(4)
            self.clear_stage(keep=(target, self.outline), run_time=1.0)
            self.play(
                FadeOut(VGroup(target, self.outline), scale=6), run_time=1.0, rate_func=smooth
            )

    def _counter(self, value: float) -> VGroup:
        number = Text(f"{int(value):,}", font=MONO, font_size=44, weight="BOLD", color=INK)
        caption = Text("differences from the reference", font=FONT, font_size=22, color=MUTED)
        block = VGroup(number, caption).arrange(DOWN, aligned_edge=RIGHT, buff=0.12)
        return block.to_corner(UP + RIGHT, buff=0.55).set_z_index(12)

    def _single_out(self, rows: VGroup, target: VMobject) -> None:
        self.play(rows.animate.shift(UP * (0.2 - target.get_y())), run_time=1.2)
        others = [r for r in rows if r is not target]
        self.outline = RoundedRectangle(
            corner_radius=0.1, width=target.width + 0.5, height=target.height + 0.35,
            stroke_color=ACCENT, stroke_width=5,
        ).move_to(target)  # fmt: skip
        self.play(
            *(r.animate.set_opacity(0.15) for r in others),
            target.animate.set_color(INK), Create(self.outline), run_time=1.2,
        )  # fmt: skip

    def episode_title(self) -> None:
        card = title_card("Episode 1", "Where the instructions live")
        self.play(FadeIn(card, shift=UP * 0.2), run_time=1.2)
        self.wait(2.2)
        self.play(FadeOut(card), run_time=0.8)

    # Act 2: the zoom ------------------------------------------------------------

    def skin(self) -> None:
        with self.narrate("skin") as n:
            group, image = self.show_photo("skin", (0.25, 0.4), rate=0.018)
            n.wait_for_line(1, fraction=0.45)
            band = RoundedRectangle(
                corner_radius=0.2, width=3.0, height=1.6, stroke_color="#FFFFFF", stroke_width=5
            )
            band.move_to(point_on(image, 0.24, 0.41))
            note = label_chip("each purple dot: one nucleus").next_to(band, DOWN, buff=0.25)
            self.annotate(group, VGroup(band), note)
        self.leave_photo(group, point_on(image, 0.24, 0.41))

    def nucleus(self) -> None:
        with self.narrate("hela") as n:
            group, image = self.show_photo("hela", (0.59, 0.54), rate=0.01)
            n.wait_for_line(1)
            self.nucleus_ring = ring(image, 0.595, 0.535, 1.45)
            self.annotate(
                group,
                self.nucleus_ring,
                label_chip("nucleus").next_to(self.nucleus_ring, UP, buff=0.2),
            )
            n.wait_for_line(2)
            facts = VGroup(label_chip("≈ 6 µm across"), label_chip("≈ 2 m of DNA inside")).arrange(
                DOWN, buff=0.2
            )
            facts.next_to(self.nucleus_ring, LEFT, buff=0.4)
            self.annotate(group, None, facts)
        self.hela = (group, image)

    def scale_up(self) -> None:
        group, _ = self.hela
        stop_motion(group)
        ball = tennis_ball(1.8).move_to(LEFT * 3.4 + DOWN * 0.1)
        with self.narrate("scale") as n:
            ring_copy = self.nucleus_ring.copy()
            self.add(ring_copy)
            self.play(FadeOut(group), FadeOut(self.chip), run_time=1.0)
            self.play(Transform(ring_copy, ball), run_time=1.4)
            n.wait_for_line(1)
            thread = tangled_thread(1.45, ball.get_center()).set_stroke(DNA_COLOR)
            facts = (
                VGroup(
                    stat_block("22 km", "of DNA, if the nucleus were a tennis ball", DNA_COLOR),
                    stat_block("0.02 mm", "thick: a human hair is about 0.07 mm"),
                )
                .arrange(DOWN, aligned_edge=LEFT, buff=0.6)
                .move_to(RIGHT * 3.0)
            )
            self.play(Create(thread), run_time=6.5, rate_func=linear)
            self.play(FadeIn(facts[0], shift=LEFT * 0.2), run_time=0.8)
            self.play(FadeIn(facts[1], shift=LEFT * 0.2), run_time=0.8)
        self.clear_stage()

    def blood(self) -> None:
        with self.narrate("blood") as n:
            group, image = self.show_photo("blood", (0.46, 0.41), rate=0.01)
            n.wait_for_line(1, fraction=0.1)
            for u, v, side in ((0.26, 0.3, DOWN), (0.75, 0.62, UP)):
                mark = ring(image, u, v, 0.85)
                self.annotate(group, mark, label_chip("no nucleus").next_to(mark, side, buff=0.15))
            n.wait_for_line(2)
            census = self._census()
            n.wait_for_line(3)
            self.play(FadeOut(census), run_time=0.8)
            mark = ring(image, 0.46, 0.41, 1.55)
            self.annotate(
                group,
                mark,
                label_chip("white blood cell · nucleus kept").next_to(mark, UP, buff=0.2),
            )
        self.leave_photo(group, point_on(image, 0.46, 0.41))

    def _census(self) -> VGroup:
        veil = Rectangle(width=config.frame_width, height=config.frame_height, stroke_width=0)
        veil.set_fill("#FBF8F1", opacity=0.94)
        title = Text("≈ 30 trillion cells in a human body", font=FONT, font_size=40, weight="BOLD")
        bar = proportion_bar(0.84)
        source = Text(
            "Sender, Fuchs & Milo, PLoS Biology, 2016", font=FONT, font_size=18, color=MUTED
        )
        content = VGroup(title, bar, source).arrange(DOWN, buff=0.6)
        census = VGroup(veil, content)
        self.play(FadeIn(veil), FadeIn(title, shift=DOWN * 0.1), run_time=0.9)
        self.play(GrowFromEdge(bar[0], LEFT), run_time=1.6)
        self.play(FadeIn(bar[1:]), FadeIn(source), run_time=0.8)
        return census

    def chromosomes(self) -> None:
        with self.narrate("chromosomes") as n:
            self._dividing_cells(n)
            self._karyotype(n)

    def _dividing_cells(self, n: Narration) -> None:
        image = fit_height(
            load_photo(ASSETS / "images" / CREDITS["mitosis"]["path"]), config.frame_height
        )
        group = Group(image)
        self.chip = caption_chip(
            str(CREDITS["mitosis"]["caption"]), credit_line("mitosis")
        ).to_corner(DR, buff=0.45)
        self.play(FadeIn(group, scale=0.9), FadeIn(self.chip), run_time=1.2)
        start_push_in(group, point_on(image, 0.5, 0.45), 0.003)
        for u, v in ((0.61, 0.42), (0.41, 0.27)):
            self.annotate(group, ring(image, u, v, 0.72), run_time=0.7)
        n.wait_for_line(1, fraction=0.35)
        for u, v, r in ((0.23, 0.36, 0.72), (0.79, 0.46, 0.95), (0.66, 0.74, 0.8)):
            self.annotate(group, ring(image, u, v, r).set_color(ACCENT), run_time=0.6)
        chip = label_chip("chromosomes, lined up to divide").move_to(point_on(image, 0.47, 0.06))
        self.annotate(group, None, chip)
        n.wait_for_line(2)
        stop_motion(group)
        self.play(FadeOut(group), FadeOut(self.chip), run_time=1.0)

    def _karyotype(self, n: Narration) -> None:
        image = fit_height(
            load_photo(ASSETS / "images" / CREDITS["karyotype"]["path"]), KARYOTYPE_HEIGHT
        )
        backing = RoundedRectangle(
            corner_radius=0.12, width=image.width + 0.4, height=image.height + 0.4
        )
        backing.set_fill("#FFFFFF", 1).set_stroke(SOFT, 2)
        print_ = Group(backing, image).move_to(UP * 0.4)
        self.chip = caption_chip(str(CREDITS["karyotype"]["caption"]), credit_line("karyotype"))
        self.chip.to_corner(DL, buff=0.25)
        self.play(FadeIn(print_, shift=UP * 0.2), FadeIn(self.chip), run_time=1.0)
        n.wait_for_line(3)
        labels = VGroup(
            *(self._pair_label(t, point_on(image, u, v)) for t, u, v in KARYOTYPE_LABELS)
        )
        self.play(
            LaggedStart(*(FadeIn(lb, scale=1.6) for lb in labels), lag_ratio=0.12), run_time=3.0
        )
        n.wait_for_line(4)
        self._parents(image)
        n.wait_for_line(4, fraction=0.72)
        sex = Ellipse(width=0.75, height=1.0, stroke_color=ACCENT, stroke_width=5).move_to(
            point_on(image, 0.925, 0.87)
        )
        self.play(Create(sex), run_time=0.8)
        self.karyotype_view = (print_, image, labels, sex)

    def _pair_label(self, text: str, where: np.ndarray) -> Text:
        return Text(text, font=FONT, font_size=22, color=ACCENT, weight="BOLD").move_to(where)

    def _parents(self, image: ImageMobject) -> None:
        marks = VGroup()
        for u, v, width, colour in ((0.05, 0.135, 0.42, MOTHER), (0.1, 0.12, 0.78, FATHER)):
            ellipse = Ellipse(width=width, height=1.55, stroke_color=colour, stroke_width=5)
            marks.add(ellipse.move_to(point_on(image, u, v)))
        tags = VGroup(label_chip("mother", 22, MOTHER), label_chip("father", 22, FATHER))
        tags.arrange(DOWN, buff=0.15).next_to(image, LEFT, buff=0.45).align_to(marks, UP)
        self.play(Create(marks), FadeIn(tags), run_time=1.0)
        self.parent_marks = VGroup(marks, tags)

    def molecule(self) -> None:
        print_, image, labels, sex = self.karyotype_view
        focus = point_on(image, 0.07, 0.13)
        phase = ValueTracker(0.0)
        colour = ValueTracker(0.0)
        phase.add_updater(lambda m, dt: m.increment_value(0.55 * dt))
        helix = always_redraw(
            lambda: double_helix(phase.get_value(), colour.get_value()).shift(UP * 0.6)
        )
        with self.narrate("molecule") as n:
            self.play(
                FadeOut(labels),
                FadeOut(sex),
                FadeOut(self.parent_marks),
                FadeOut(self.chip),
                run_time=0.6,
            )
            chr1 = Ellipse(width=1.3, height=2.2, stroke_color=ACCENT, stroke_width=5).move_to(
                focus
            )
            self.play(Create(chr1), run_time=0.8)
            n.wait_for_line(1)
            whole = Group(print_, chr1)
            shift = zoom_shift(whole.get_center(), focus, INTO_CHROMOSOME)
            self.play(
                FadeOut(whole, scale=INTO_CHROMOSOME, shift=shift), run_time=1.6, rate_func=smooth
            )
            self.add(phase)
            self.play(FadeIn(helix, scale=0.2), run_time=1.4)
            self._width_marker()
            n.wait_for_line(2)
            self._bases(colour)
            n.wait_for_line(3)
            self._sequence_row()
        self.helix_parts = (helix, phase)

    def _width_marker(self) -> None:
        marker = DoubleArrow(
            UP * 1.75, DOWN * 0.55, buff=0, color=INK, stroke_width=4, tip_length=0.2
        )
        marker.move_to(RIGHT * 6.1 + UP * 0.6)
        label = Text("2 nm", font=FONT, font_size=28, weight="BOLD").next_to(marker, LEFT, buff=0.2)
        self.play(GrowArrow(marker), FadeIn(label), run_time=0.9)
        self.width_marker = VGroup(marker, label)

    def _bases(self, colour: ValueTracker) -> None:
        self.play(colour.animate.set_value(1.0), FadeOut(self.width_marker), run_time=1.2)
        legend = (
            VGroup(*(base_tile(b, 0.8) for b in "ACGT"))
            .arrange(RIGHT, buff=0.35)
            .move_to(DOWN * 2.2)
        )
        self.play(
            LaggedStart(*(FadeIn(t, shift=UP * 0.2) for t in legend), lag_ratio=0.5), run_time=2.0
        )
        self.legend = legend

    def _sequence_row(self) -> None:
        letters = (
            VGroup(
                *(
                    Text(b, font=MONO, font_size=40, weight="BOLD", color=BASE_COLORS[b])
                    for b in SEQUENCE[:24]
                )
            )
            .arrange(RIGHT, buff=0.12)
            .move_to(DOWN * 2.2)
        )
        self.play(Transform(self.legend, letters), run_time=1.4)

    def doubt(self) -> None:
        helix, phase = self.helix_parts
        with self.narrate("doubt") as n:
            question = Text("Why believe it?", font=FONT, font_size=72, weight="BOLD")
            self.play(FadeOut(self.legend), FadeOut(helix), run_time=0.8)
            phase.clear_updaters()
            self.play(Write(question), run_time=1.2)
            n.wait_for_line(1)
            self.play(question.animate.scale(0.5).to_edge(UP, buff=0.6), run_time=0.8)
            self._building_blocks()
            n.wait_for_line(2)
            self.clear_stage(run_time=0.8)
            closing = title_card("Next", "The experiment that settled it · 1944")
            self.play(FadeIn(closing, shift=UP * 0.2), run_time=1.0)
        self.wait(1.5)
        self.clear_stage()

    def _building_blocks(self) -> None:
        dna = VGroup(*(base_tile(b, 0.7) for b in "ACGT")).arrange(RIGHT, buff=0.25)
        palette = ["#1B9E77", "#2C6FB7", "#D98B1C", "#C8463D", "#6C5B7B"]
        aminos = VGroup(
            *(
                Circle(radius=0.3, fill_color=palette[i % 5], fill_opacity=1, stroke_width=0)
                for i in range(20)
            )
        )
        aminos.arrange_in_grid(rows=4, cols=5, buff=0.2)
        dna_col = VGroup(Text("DNA: 4 building blocks", font=FONT, font_size=30), dna).arrange(
            DOWN, buff=0.5
        )
        protein_col = VGroup(
            Text("Protein: 20 building blocks", font=FONT, font_size=30), aminos
        ).arrange(DOWN, buff=0.5)
        VGroup(dna_col, protein_col).arrange(RIGHT, buff=2.2).move_to(DOWN * 0.3)
        self.play(FadeIn(dna_col, shift=UP * 0.2), run_time=0.9)
        self.play(
            FadeIn(protein_col[0]),
            LaggedStart(*(FadeIn(a, scale=0.5) for a in aminos), lag_ratio=0.06),
            run_time=1.8,
        )

    def credits(self) -> None:
        heading = Text("Images", font=FONT, font_size=30, weight="BOLD")
        rows = VGroup(
            *(
                Text(f"{r['caption']}  ·  {credit_line(k)}", font=FONT, font_size=18, color=MUTED)
                for k, r in CREDITS.items()
            )
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.18)
        voice = Text(
            "Narration: Kokoro-82M (am_fenrir) · Animation: Manim Community",
            font=FONT,
            font_size=18,
            color=MUTED,
        )
        block = (
            VGroup(heading, rows, voice).arrange(DOWN, aligned_edge=LEFT, buff=0.4).move_to(ORIGIN)
        )
        self.play(FadeIn(block), run_time=1.0)
        self.wait(4.0)
        self.play(FadeOut(block), run_time=1.0)
