import json
import re
import time
import tomllib
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from urllib.error import HTTPError

API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "halden-lessons/0.1 (educational video series; github.com/brian-rey-development)"
ALLOWED_LICENSES = ("public domain", "pd", "cc0", "cc by")
MAX_WIDTH = 3000
RETRIES = 5
BACKOFF_SECONDS = 4.0
TOO_MANY_REQUESTS = 429
PAUSE_BETWEEN_DOWNLOADS = 1.5
TAG = re.compile(r"<[^>]+>")


class LicenseNotAllowedError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class ImageAsset:
    key: str
    title: str
    caption: str
    license: str
    artist: str
    page_url: str
    path: Path


def _get(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})  # noqa: S310  (https only)
    for attempt in range(RETRIES):
        try:
            with urllib.request.urlopen(request) as response:  # noqa: S310
                return response.read()
        except HTTPError as error:
            if error.code != TOO_MANY_REQUESTS or attempt == RETRIES - 1:
                raise
            time.sleep(BACKOFF_SECONDS * 2**attempt)
    raise RuntimeError("unreachable")


def _metadata(title: str) -> dict[str, object]:
    params = {
        "action": "query", "titles": f"File:{title}", "prop": "imageinfo",
        "iiprop": "url|extmetadata|size", "iiurlwidth": MAX_WIDTH, "format": "json",
    }  # fmt: skip
    pages = json.loads(_get(f"{API}?{urllib.parse.urlencode(params)}"))["query"]["pages"]
    return next(iter(pages.values()))["imageinfo"][0]


def _clean(meta: dict[str, dict[str, str]], field: str) -> str:
    return TAG.sub("", meta.get(field, {}).get("value", "unknown")).strip()


def fetch_image(key: str, entry: dict[str, str], target_dir: Path) -> ImageAsset:
    info = _metadata(entry["title"])
    meta: dict[str, dict[str, str]] = info["extmetadata"]  # type: ignore[assignment]
    license_name = _clean(meta, "LicenseShortName")
    if not license_name.lower().startswith(ALLOWED_LICENSES):
        raise LicenseNotAllowedError(f"{entry['title']}: {license_name}")
    url = str(info.get("thumburl") or info["url"])
    path = target_dir / f"{key}{Path(urllib.parse.urlparse(url).path).suffix.lower()}"
    if not path.exists():
        path.write_bytes(_get(url))
        time.sleep(PAUSE_BETWEEN_DOWNLOADS)
    return ImageAsset(
        key, entry["title"], entry["caption"], license_name,
        _clean(meta, "Artist"), str(info["descriptionurl"]), path,
    )  # fmt: skip


def fetch_all(manifest: Path, target_dir: Path) -> list[ImageAsset]:
    target_dir.mkdir(parents=True, exist_ok=True)
    entries = tomllib.loads(manifest.read_text(encoding="utf-8"))
    return [fetch_image(key, entry, target_dir) for key, entry in entries.items()]


def credits_markdown(assets: list[ImageAsset]) -> str:
    rows = [f"| {a.caption} | {a.artist} | {a.license} | [source]({a.page_url}) |" for a in assets]
    header = "# Image credits\n\n| Image | Author | License | Source |\n|---|---|---|---|\n"
    return header + "\n".join(rows) + "\n"


def image_path(images_dir: Path, key: str) -> Path:
    return next(images_dir.glob(f"{key}.*"))
