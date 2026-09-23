import hashlib
from functools import cache
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro import KPipeline

SAMPLE_RATE = 24_000
MODEL_REPO = "hexgrad/Kokoro-82M"
AMERICAN_ENGLISH = "a"
DEFAULT_VOICE = "am_fenrir"
DEFAULT_SPEED = 1.0
CACHE_KEY_LENGTH = 16


@cache
def _pipeline() -> KPipeline:
    return KPipeline(lang_code=AMERICAN_ENGLISH, repo_id=MODEL_REPO)


def synthesize(
    text: str,
    cache_dir: Path,
    voice: str = DEFAULT_VOICE,
    speed: float = DEFAULT_SPEED,
) -> Path:
    key = hashlib.sha256(f"{voice}|{speed}|{text}".encode()).hexdigest()[:CACHE_KEY_LENGTH]
    path = cache_dir / f"{key}.wav"
    if path.exists():
        return path
    chunks = [np.asarray(audio) for _, _, audio in _pipeline()(text, voice=voice, speed=speed)]
    cache_dir.mkdir(parents=True, exist_ok=True)
    sf.write(path, np.concatenate(chunks), SAMPLE_RATE)
    return path


def duration_seconds(path: Path) -> float:
    return sf.info(path).duration
