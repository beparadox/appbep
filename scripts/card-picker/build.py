"""
Card picker, step 3: make the card's files from your picks.

Reads <card>/picks.json (from the picker page), <card>/picker/manifest.json and
<card>/card.config.json, and writes the finished card to <card>/out/<id>/:

  card.json          what the card page reads: the words, and the slides in order
  <hash>.jpg         each photo: turned upright, at most 1600 px, no metadata
  <hash>.mp4 / .jpg  each video section: cut, turned, sized for phones, no metadata, + a poster
  <hash>.m4a         the music, evened out, no metadata

File names are hashes, so nothing in them says who or where. Re-running only redoes what
changed. card.config.json (private, never committed):

  {
    "id": "k7f3q9x2m4ab",        # the card's link: appbep.com/birthday/<id> (made up if missing)
    "name": "...", "age": 15, "from": "...",
    "message": "Paragraphs, separated by blank lines.",
    "bonusLink": "Text of the link to the bonus gallery",
    "bonusTitle": "Words on the bonus round's opening card",  # optional; bonusLink if missing
    "bonusSeconds": 1,            # optional: each bonus photo's time on screen (0.33 if missing)
    "crop": {"PXL_....jpg": [0.16, 0.37, 0.48, 0.245]},  # optional: keep only part of a photo
                                  # (left, top, width, height, as fractions of the upright photo)
    "theme": "blue",              # optional; pink if missing
    "ending": "bonusRound",       # optional: what follows the show (see web/src/birthday/types.ts)
    "music": "/path/to/song",     # or null
    "musicCredit": "Music: ...",  # shown small on the card, for songs that ask to be credited
    "localOnly": true             # true while the card has anything that mustn't be uploaded
  }

Usage: python build.py ~/dev/appbep-cards/<card>
"""

import hashlib
import json
import secrets
import string
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageOps
from pillow_heif import register_heif_opener

register_heif_opener()

PHOTO_MAX = 1600
VIDEO_MAX = 1280  # longest side
# Bump to redo every file (e.g. after changing the settings below).
RECIPE = "v1"


def make_id() -> str:
    alphabet = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(12))


def name_for(card_id: str, *parts) -> str:
    """A file name that changes when anything about the file changes, and says nothing else."""
    raw = json.dumps([RECIPE, card_id, *parts], sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()[:12]


def photo(src: Path, turn: int, out: Path, stem: str, crop: list[float] | None = None) -> dict:
    target = out / f"{stem}.jpg"
    with Image.open(src) as raw:
        img = ImageOps.exif_transpose(raw).convert("RGB")
    if turn:
        img = img.rotate(-turn, expand=True)  # PIL turns counter-clockwise; ours: + = clockwise
    if crop:
        x, y, w, h = crop
        W, H = img.size
        img = img.crop((round(x * W), round(y * H), round((x + w) * W), round((y + h) * H)))
    img.thumbnail((PHOTO_MAX, PHOTO_MAX), Image.Resampling.LANCZOS)
    if not target.exists():
        # A fresh image with no EXIF: no GPS, no camera, no date.
        img.save(target, quality=82, optimize=True, progressive=True)
    return {"type": "photo", "src": target.name, "w": img.width, "h": img.height}


def video_filter(turn: int) -> str:
    rotate = {90: "transpose=1,", -90: "transpose=2,", 180: "hflip,vflip,", -180: "hflip,vflip,"}
    return rotate.get(turn, "") + (
        f"scale='if(gt(iw,ih),min({VIDEO_MAX},iw),-2)':'if(gt(iw,ih),-2,min({VIDEO_MAX},ih))'"
    )


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL)


def clip(src: Path, item: dict, turn: int, has_audio: bool, out: Path, stem: str) -> dict:
    target = out / f"{stem}.mp4"
    poster = out / f"{stem}.jpg"
    sound = bool(item.get("sound")) and has_audio
    if not target.exists():
        start, end = float(item["start"]), float(item["end"])
        cmd = ["ffmpeg", "-v", "error", "-y", "-ss", f"{start:.3f}", "-i", str(src), "-t", f"{end - start:.3f}",
               "-map", "0:v:0", "-vf", video_filter(turn),
               "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-preset", "slow", "-crf", "26",
               "-map_metadata", "-1", "-map_chapters", "-1", "-metadata:s:v", "rotate=0",
               "-movflags", "+faststart"]
        if sound:
            cmd += ["-map", "0:a:0", "-c:a", "aac", "-b:a", "128k", "-ac", "2"]
        else:
            cmd += ["-an"]
        run(cmd + [str(target)])
        run(["ffmpeg", "-v", "error", "-y", "-i", str(target), "-frames:v", "1", "-q:v", "4",
             "-map_metadata", "-1", str(poster)])
    with Image.open(poster) as p:
        w, h = p.size
    return {"type": "video", "src": target.name, "poster": poster.name, "w": w, "h": h, "sound": sound}


def even(n: float) -> int:
    return max(2, int(round(n / 2)) * 2)


def joined(parts: list[tuple[Path, dict, int, bool, dict]], out: Path, stem: str) -> dict:
    """
    Clips the picker joined ("joinNext"), made into one video: each part sized to the first
    (black bars if its shape differs), played one after another. If any part has sound,
    the parts without get silence, so the whole thing plays with its sound.
    parts: (source, picked item, turn, source has audio, manifest entry).
    """
    target = out / f"{stem}.mp4"
    poster = out / f"{stem}.jpg"
    sounds = [bool(item.get("sound")) and has_audio for _, item, _, has_audio, _ in parts]
    any_sound = any(sounds)
    if not target.exists():
        # The first part's shape, as it will show: turned, at most VIDEO_MAX on its long side.
        _, _, turn0, _, m0 = parts[0]
        w, h = m0["width"], m0["height"]
        if abs(turn0) == 90:
            w, h = h, w
        scale = min(1.0, VIDEO_MAX / max(w, h))
        W, H = even(w * scale), even(h * scale)
        rotate = {90: "transpose=1,", -90: "transpose=2,", 180: "hflip,vflip,", -180: "hflip,vflip,"}

        cmd = ["ffmpeg", "-v", "error", "-y"]
        for src, item, _, _, _ in parts:
            start, end = float(item["start"]), float(item["end"])
            cmd += ["-ss", f"{start:.3f}", "-t", f"{end - start:.3f}", "-i", str(src)]
        chains, joins = [], ""
        # The parts without sound get silence: one silence input, split one way per part.
        quiet = [n for n in range(len(parts)) if not sounds[n]]
        if any_sound and quiet:
            cmd += ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"]
            chains.append(f"[{len(parts)}:a]asplit={len(quiet)}" + "".join(f"[s{n}]" for n in quiet))
        for n, (_, item, turn, _, _) in enumerate(parts):
            length = float(item["end"]) - float(item["start"])
            chains.append(
                f"[{n}:v]{rotate.get(turn, '')}"
                f"scale={W}:{H}:force_original_aspect_ratio=decrease,"
                f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v{n}]"
            )
            if any_sound:
                source = f"[{n}:a]aformat=sample_rates=48000:channel_layouts=stereo,apad," if sounds[n] else f"[s{n}]"
                chains.append(f"{source}atrim=duration={length:.3f},asetpts=PTS-STARTPTS[a{n}]")
            joins += f"[v{n}]" + (f"[a{n}]" if any_sound else "")
        chains.append(f"{joins}concat=n={len(parts)}:v=1:a={1 if any_sound else 0}"
                      + ("[v][a]" if any_sound else "[v]"))
        cmd += ["-filter_complex", ";".join(chains), "-map", "[v]"]
        cmd += ["-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "26",
                "-map_metadata", "-1", "-map_chapters", "-1", "-movflags", "+faststart"]
        if any_sound:
            cmd += ["-map", "[a]", "-c:a", "aac", "-b:a", "128k", "-ac", "2"]
        run(cmd + [str(target)])
        run(["ffmpeg", "-v", "error", "-y", "-i", str(target), "-frames:v", "1", "-q:v", "4",
             "-map_metadata", "-1", str(poster)])
    with Image.open(poster) as p:
        w, h = p.size
    return {"type": "video", "src": target.name, "poster": poster.name, "w": w, "h": h, "sound": any_sound}


def groups(items: list[dict]) -> list[list[dict]]:
    """The picked items, with clips marked joinNext gathered up with the clips after them."""
    out: list[list[dict]] = []
    for n, item in enumerate(items):
        before = items[n - 1] if n else None
        if (before and before.get("joinNext") and before["type"] == "clip"
                and item["type"] == "clip" and out):
            out[-1].append(item)
        else:
            out.append([item])
    return out


def music(src: Path, out: Path, stem: str) -> str:
    target = out / f"{stem}.m4a"
    if not target.exists():
        run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vn", "-af", "loudnorm=I=-18:TP=-2",
             "-c:a", "aac", "-b:a", "160k", "-map_metadata", "-1", str(target)])
    return target.name


def paragraphs(text: str) -> list[str]:
    return [" ".join(p.split()) for p in text.strip().split("\n\n") if p.strip()]


def main() -> None:
    card = Path(sys.argv[1]).expanduser().resolve()
    config_path = card / "card.config.json"
    config = json.loads(config_path.read_text())
    if not config.get("id"):
        config["id"] = make_id()
        config_path.write_text(json.dumps(config, indent=2, ensure_ascii=False) + "\n")
    card_id = config["id"]

    picks = json.loads((card / "picks.json").read_text())
    media = {m["id"]: m for m in json.loads((card / "picker" / "manifest.json").read_text())["items"]}
    rotate = picks.get("rotate", {})
    crops = config.get("crop", {})
    out = card / "out" / card_id
    out.mkdir(parents=True, exist_ok=True)

    def make(item: dict) -> dict:
        m = media[item["src"]]
        src = card / "originals" / m["file"]
        turn = int(rotate.get(item["src"], 0))
        if item["type"] == "photo":
            crop = crops.get(m["file"])
            return photo(src, turn, out, name_for(card_id, m["file"], turn, *([crop] if crop else [])), crop)
        stem = name_for(card_id, m["file"], turn, item["start"], item["end"], item.get("sound"))
        return clip(src, item, turn, bool(m.get("audio")), out, stem)

    def make_joined(items: list[dict]) -> dict:
        parts = []
        for item in items:
            m = media[item["src"]]
            parts.append((card / "originals" / m["file"], item, int(rotate.get(item["src"], 0)),
                          bool(m.get("audio")), m))
        stem = name_for(card_id, "joined", [
            [m["file"], turn, item["start"], item["end"], item.get("sound")]
            for _, item, turn, _, m in parts
        ])
        return joined(parts, out, stem)

    slides, bonus = [], []
    lists = [(slides, groups(picks["items"])), (bonus, groups(picks.get("bonus", [])))]
    total = sum(len(items) for _, items in lists)
    done = 0
    for target, items in lists:
        for group in items:
            done += 1
            print(f"\r[{done}/{total}]", end="", flush=True)
            target.append(make(group[0]) if len(group) == 1 else make_joined(group))
    print()

    music_name = None
    if config.get("music"):
        src = Path(config["music"]).expanduser()
        music_name = music(src, out, name_for(card_id, "music", str(src)))

    data = {
        "version": 1,
        "name": config.get("name", ""),
        "age": config.get("age"),
        "from": config.get("from", ""),
        "message": paragraphs(config.get("message", "")),
        "photoSeconds": picks.get("photoSeconds", 2),
        "music": music_name,
        "musicCredit": config.get("musicCredit") if music_name else None,
        "slides": slides,
        "bonus": {
            "link": config.get("bonusLink", "Bonus"),
            "title": config.get("bonusTitle"),
            "seconds": config.get("bonusSeconds"),
            "slides": bonus,
        } if bonus else None,
        "theme": config.get("theme"),
        "ending": config.get("ending"),
    }
    (out / "card.json").write_text(json.dumps(data, ensure_ascii=False))

    # Clear out files from earlier builds that the card no longer uses.
    used = {"card.json", music_name}
    for s in slides + bonus:
        used.update({s["src"], s.get("poster")})
    for f in out.iterdir():
        if f.name not in used:
            f.unlink()

    size = sum(f.stat().st_size for f in out.iterdir()) / 1e6
    print(f"{len(slides)} slides, {len(bonus)} bonus, {size:.1f} MB -> {out}")
    print(f"Local preview: http://localhost:5173/birthday/{card_id}  (npm run dev with CARDS_DIR={card / 'out'})")
    if config.get("localOnly"):
        print("localOnly is set: this card must NOT be uploaded until that's cleared.")


if __name__ == "__main__":
    main()
