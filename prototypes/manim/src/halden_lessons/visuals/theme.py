from manim import MarkupText, Text, config

BACKGROUND = "#FBF8F1"
INK = "#1F2328"
MUTED = "#6B7280"
SOFT = "#E7E1D4"
ACCENT = "#B4432F"
HIGHLIGHT = "#F2C94C"
DNA_COLOR = "#1F8FC4"
MOTHER = "#B4432F"
FATHER = "#2C6FB7"

BASE_COLORS = {
    "A": "#1B9E77",
    "C": "#2C6FB7",
    "G": "#D98B1C",
    "T": "#C8463D",
    "N": MUTED,
}

FONT = "Avenir Next"
MONO = "Menlo"
FRAME_RATE = 30
MAX_CACHED_CLIPS = 5000


def apply_theme() -> None:
    config.background_color = BACKGROUND
    config.frame_rate = FRAME_RATE
    config.max_files_cached = MAX_CACHED_CLIPS
    Text.set_default(font=FONT, color=INK)
    MarkupText.set_default(font=FONT, color=INK)
