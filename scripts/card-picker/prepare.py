"""
Card picker, step 1: look at a card's photos and videos and make what the picker page
needs to show them. Reads <card>/originals/ (never changes it) and writes:

  <card>/picker/manifest.json   one entry per photo or video, oldest first
  <card>/picker/thumbs/<id>.jpg small squares for the grid
  <card>/picker/view/<id>.jpg   photos the browser can show (HEIC converted, turned upright)
  <card>/picker/view/<id>.mp4   videos the browser can't play as they are (e.g. HEVC)

Usage (needs Pillow + pillow-heif, and ffmpeg/ffprobe on the PATH):
  python prepare.py ~/dev/appbep-cards/<card> [--take-new]

--take-new first copies any photos and videos sitting loose in <card>/ (not in a folder)
into <card>/originals/, read-only, leaving the loose ones where they are. That's for
adding to a card by dropping files in its folder; the picker's "Look for new photos"
button runs it. Re-running only does the files it hasn't done before.

Card folders hold private photos: keep them outside the repo.
"""

import hashlib
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageOps
from pillow_heif import register_heif_opener

register_heif_opener()

PHOTO = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp"}
VIDEO = {".mp4", ".mov", ".m4v", ".mpeg", ".mpg", ".3gp", ".webm"}
THUMB = 360
VIEW = 1600
# Videos the picker can play straight from the original file.
PLAYABLE = {"h264", "vp8", "vp9", "av1"}


def kind_of(path: Path) -> str | None:
    ext = path.suffix.lower()
    return "photo" if ext in PHOTO else "video" if ext in VIDEO else None


def date_from_name(name: str) -> str | None:
    """Guess when it was taken from the file name, as phones and cameras name them."""
    patterns = [
        # IMG_20140403_155447934, VID_20161124_..., PXL_20241130_...
        (r"(?:IMG|VID|PXL)_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})", ("Y", "mo", "d", "h", "mi")),
        # 2012-07-03 11.51.12
        (r"(\d{4})-(\d{2})-(\d{2}) (\d{2})\.(\d{2})", ("Y", "mo", "d", "h", "mi")),
        # 1121171443 = Nov 21 2017, 14:43 (MMDDYYhhmm)
        (r"^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})", ("mo", "d", "y", "h", "mi")),
    ]
    for pattern, order in patterns:
        m = re.search(pattern, name)
        if not m:
            continue
        p = dict(zip(order, map(int, m.groups())))
        try:
            year = p["Y"] if "Y" in p else 2000 + p["y"]
            return datetime(year, p["mo"], p["d"], p["h"], p["mi"]).isoformat()
        except ValueError:
            continue
    return None


def photo_date(img: Image.Image) -> str | None:
    exif = img.getexif()
    raw = exif.get_ifd(0x8769).get(36867) or exif.get(306)  # DateTimeOriginal, DateTime
    try:
        return datetime.strptime(str(raw).strip(), "%Y:%m:%d %H:%M:%S").isoformat() if raw else None
    except ValueError:
        return None


def square(img: Image.Image, size: int) -> Image.Image:
    return ImageOps.fit(img.convert("RGB"), (size, size), Image.Resampling.LANCZOS)


def do_photo(src: Path, id_: str, out: Path) -> dict:
    with Image.open(src) as raw:
        date = photo_date(raw)
        img = ImageOps.exif_transpose(raw).convert("RGB")
    square(img, THUMB).save(out / "thumbs" / f"{id_}.jpg", quality=82)
    view = img.copy()
    view.thumbnail((VIEW, VIEW), Image.Resampling.LANCZOS)
    view.save(out / "view" / f"{id_}.jpg", quality=85)
    return {
        "width": img.width,
        "height": img.height,
        "date": date or date_from_name(src.name),
        "view": f"view/{id_}.jpg",
    }


def probe(src: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(src)],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    return json.loads(out)


def do_video(src: Path, id_: str, out: Path) -> dict:
    info = probe(src)
    video = next(s for s in info["streams"] if s.get("codec_type") == "video" and s.get("width"))
    has_audio = any(s.get("codec_type") == "audio" for s in info["streams"])
    duration = float(info["format"].get("duration") or video.get("duration") or 0)
    # Phones store upright videos sideways plus a "rotate" note.
    rotation = 0
    for sd in video.get("side_data_list", []):
        rotation = int(sd.get("rotation", rotation) or 0)
    rotation = int(video.get("tags", {}).get("rotate", rotation) or 0)
    w, h = video["width"], video["height"]
    if abs(rotation) % 180 == 90:
        w, h = h, w
    created = info["format"].get("tags", {}).get("creation_time")
    date = date_from_name(src.name)
    if not date and created:
        date = created.replace("Z", "")[:19]

    # A frame from a second in (or the middle of a short clip) for the thumbnail.
    at = min(1.0, duration / 2)
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-ss", f"{at:.2f}", "-i", str(src), "-frames:v", "1",
         "-vf", f"scale={THUMB}:{THUMB}:force_original_aspect_ratio=increase,crop={THUMB}:{THUMB}",
         str(out / "thumbs" / f"{id_}.jpg")],
        check=True,
    )
    view = None
    if video.get("codec_name") not in PLAYABLE:
        view = f"view/{id_}.mp4"
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", str(src), "-map", "0:v:0", "-map", "0:a:0?",
             "-vf", "scale='min(1280,iw)':-2", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
             "-c:a", "aac", "-movflags", "+faststart", str(out / view)],
            check=True,
        )
    return {
        "width": w,
        "height": h,
        "date": date,
        "duration": round(duration, 2),
        "audio": has_audio,
        "view": view,  # None: play the original
    }


def take_new(card: Path, originals: Path) -> None:
    """Copy photos and videos loose in the card folder into originals/, read-only."""
    originals.mkdir(exist_ok=True)
    new = [p for p in sorted(card.iterdir())
           if p.is_file() and kind_of(p) and not (originals / p.name).exists()]
    if not new:
        print("No new files in the card folder.")
        return
    originals.chmod(originals.stat().st_mode | 0o200)  # writable while copying in
    for p in new:
        target = originals / p.name
        shutil.copy2(p, target)
        target.chmod(0o444)
    print(f"Copied {len(new)} new file{'s' if len(new) != 1 else ''} into originals/.")


def main() -> None:
    card = Path(sys.argv[1]).expanduser().resolve()
    originals = card / "originals"
    if "--take-new" in sys.argv[2:]:
        take_new(card, originals)
    out = card / "picker"
    for d in ("thumbs", "view"):
        (out / d).mkdir(parents=True, exist_ok=True)

    previous = {}
    manifest_path = out / "manifest.json"
    if manifest_path.exists():
        previous = {e["file"]: e for e in json.loads(manifest_path.read_text())["items"]}

    items = []
    files = sorted(p for p in originals.rglob("*") if p.is_file() and kind_of(p))
    for n, src in enumerate(files, 1):
        rel = src.relative_to(originals).as_posix()
        if rel in previous:  # already done: re-running only handles new files
            items.append(previous[rel])
            continue
        kind = kind_of(src)
        id_ = hashlib.sha1(rel.encode()).hexdigest()[:10]
        print(f"[{n}/{len(files)}] {kind} {rel}", flush=True)
        try:
            extra = do_photo(src, id_, out) if kind == "photo" else do_video(src, id_, out)
        except Exception as err:  # noqa: BLE001 - report and carry on with the rest
            print(f"   skipped: {err}", file=sys.stderr)
            continue
        items.append({"id": id_, "file": rel, "kind": kind, "thumb": f"thumbs/{id_}.jpg", **extra})

    items.sort(key=lambda e: (e["date"] or "9999", e["file"]))
    manifest_path.write_text(json.dumps({"items": items}, indent=1))
    photos = sum(e["kind"] == "photo" for e in items)
    print(f"Done: {photos} photos, {len(items) - photos} videos -> {manifest_path}")


if __name__ == "__main__":
    main()
