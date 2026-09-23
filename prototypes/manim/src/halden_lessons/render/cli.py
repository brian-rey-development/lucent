import argparse
import json
import os
import shutil
import subprocess
from dataclasses import asdict
from pathlib import Path

from halden_lessons.assets.commons import credits_markdown, fetch_all

LESSONS_ROOT = Path(__file__).resolve().parents[3]
EPISODES = LESSONS_ROOT / "episodes"
ASSETS = LESSONS_ROOT / "assets"
OUTPUT = LESSONS_ROOT / "output"
MEDIA = OUTPUT / "media"
SCENE_CLASS = "Lesson"
QUALITIES = {"low": "l", "medium": "m", "high": "h", "4k": "k"}
SUBTITLE_TRACKS = (("en", "eng", "English"), ("es", "spa", "Español"))


def _render(episode: str, quality: str) -> Path:
    scene_file = EPISODES / episode / "scene.py"
    command = [
        "manim", "render", f"-q{QUALITIES[quality]}", "--media_dir", str(MEDIA),
        str(scene_file), SCENE_CLASS,
    ]  # fmt: skip
    subprocess.run(command, check=True, env=dict(os.environ), cwd=LESSONS_ROOT)  # noqa: S603  (fixed argv, no shell)
    return max(MEDIA.glob(f"videos/scene/*/{SCENE_CLASS}.mp4"), key=lambda p: p.stat().st_mtime)


def _mux(video: Path, episode: str, target: Path) -> None:
    subtitles = [MEDIA / "subtitles" / f"{episode}.{code}.srt" for code, _, _ in SUBTITLE_TRACKS]
    inputs = [arg for path in (video, *subtitles) for arg in ("-i", str(path))]
    maps = [arg for index in range(len(subtitles) + 1) for arg in ("-map", str(index))]
    metadata = [
        arg
        for index, (_, iso, title) in enumerate(SUBTITLE_TRACKS)
        for arg in (
            f"-metadata:s:s:{index}",
            f"language={iso}",
            f"-metadata:s:s:{index}",
            f"title={title}",
        )
    ]
    command = [
        "ffmpeg", "-y", "-loglevel", "error", *inputs, *maps, "-c", "copy", "-c:s", "mov_text",
        *metadata, "-disposition:s:0", "default", str(target),
    ]  # fmt: skip
    subprocess.run(command, check=True)  # noqa: S603  (fixed argv, no shell)
    for path in subtitles:
        shutil.copy(path, OUTPUT / path.name)


def render(episode: str, quality: str) -> None:
    video = _render(episode, quality)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    target = OUTPUT / f"{episode}.mp4"
    _mux(video, episode, target)
    print(f"Rendered {target}")  # noqa: T201


def fetch_assets() -> None:
    assets = fetch_all(ASSETS / "images.toml", ASSETS / "images")
    (ASSETS / "CREDITS.md").write_text(credits_markdown(assets), encoding="utf-8")
    records = [{**asdict(a), "path": a.path.name} for a in assets]
    (ASSETS / "credits.json").write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n")
    print(f"Fetched {len(assets)} images into {ASSETS / 'images'}")  # noqa: T201


def main() -> None:
    parser = argparse.ArgumentParser(prog="halden-lesson", description="Build narrated lessons.")
    commands = parser.add_subparsers(dest="command", required=True)
    render_cmd = commands.add_parser("render", help="render an episode to output/<episode>.mp4")
    render_cmd.add_argument("episode", help="folder name under lessons/episodes")
    render_cmd.add_argument("--quality", choices=QUALITIES, default="high")
    commands.add_parser("fetch-assets", help="download licensed images and regenerate credits")
    args = parser.parse_args()
    if args.command == "render":
        render(args.episode, args.quality)
    else:
        fetch_assets()
