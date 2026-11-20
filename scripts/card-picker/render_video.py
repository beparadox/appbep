"""
Card picker, keepsake: turn a built card into one video file, to keep after the card is
taken offline.

Plays the card the way it plays on the site, start to finish, with nobody tapping:

  the envelope opening -> the slideshow (photos with a slow zoom and cross-fades, clips
  with their own sound while the music steps aside) -> the message, with balloons
  dropping and the countdown -> the bonus photos as a flipbook -> "Happy Birthday",
  with balloons floating up -> fade to black.

Reads <card>/out/<id>/ (made by build.py), so build the card first. Writes
<card>/keep/birthday-card.mp4: H.264 + AAC, which plays on any phone, computer or TV.
Nothing is uploaded and nothing is written into the repo.

Usage:
  python render_video.py ~/dev/appbep-cards/<card>              # 1080p, a few minutes
  python render_video.py ~/dev/appbep-cards/<card> --preview    # 540p, fast, to check it
  python render_video.py ~/dev/appbep-cards/<card> --height 720 --out somewhere.mp4

Needs ffmpeg on the PATH, and Pillow + numpy (pip install pillow numpy).
"""

import argparse
import json
import math
import subprocess
import sys
import tempfile
import time
import wave
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

REPO = Path(__file__).resolve().parents[2]
FONTS = REPO / "web" / "public" / "fonts"
EMOJI_FONT = Path("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf")

FPS = 30
RATE = 48000  # audio samples a second

# Timings, from the card's code (web/src/birthday/*) unless noted.
SLIDE_FADE = 0.7  # Slideshow FADE_MS
MUSIC_FADE = 0.5  # music.ts FADE
FLIP = 0.33  # Gallery FLIP_MS
REEL_INTRO = 5.0  # SelfieReel INTRO_MS
REEL_HOLD = 1.2  # SelfieReel HOLD_MS
COUNT_FROM = 5  # BirthdayCard COUNT_FROM
ENVELOPE_WAIT = 2.4  # video only: one "bob" of the envelope before it opens
FINALE = 10.0  # video only: how long "Happy Birthday" stays up
END_FADE = 2.0  # video only: fade to black at the very end
MUSIC_OUT = 3.0  # video only: the music fades out over the last few seconds

INK = (255, 247, 251)
SOFT = (230, 217, 245)
PINK = (255, 95, 162)
GOLD = (255, 209, 102)
TEAL = (79, 209, 197)
VIOLET = (155, 123, 255)
PAPER = (255, 250, 243)
BALLOON_COLORS = [PINK, GOLD, TEAL, VIOLET, (255, 138, 91), (126, 224, 129)]


# ---------- Small helpers ----------


def bezier(x1: float, y1: float, x2: float, y2: float):
    """A CSS cubic-bezier() timing function."""

    def f(x: float) -> float:
        x = min(max(x, 0.0), 1.0)
        t = x
        for _ in range(8):  # Newton: find t where the curve's x is x
            cx = 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t**3 - x
            dx = 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t
            if abs(dx) < 1e-6:
                break
            t = min(max(t - cx / dx, 0.0), 1.0)
        return 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t**3

    return f


EASE = bezier(0.25, 0.1, 0.25, 1)
EASE_IN = bezier(0.42, 0, 1, 1)
EASE_OUT = bezier(0, 0, 0.58, 1)
EASE_IN_OUT = bezier(0.42, 0, 0.58, 1)
RISE = bezier(0.2, 1.3, 0.4, 1)  # bd-rise-in: overshoots a little
PAPER_RISE = bezier(0.2, 1.2, 0.4, 1)
LETTER_UP = bezier(0.3, 1.4, 0.5, 1)
FALL = bezier(0.35, 0, 0.75, 1)


def clamp01(x: float) -> float:
    return min(max(x, 0.0), 1.0)


def run_json(cmd: list[str]) -> dict:
    return json.loads(subprocess.run(cmd, check=True, capture_output=True, text=True).stdout)


def duration_of(path: Path) -> float:
    info = run_json(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)])
    return float(info["format"]["duration"])


def has_audio(path: Path) -> bool:
    info = run_json(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index",
                     "-of", "json", str(path)])
    return bool(info.get("streams"))


def decode_audio(path: Path) -> np.ndarray:
    """Any audio file -> float32 stereo samples at RATE, shape (n, 2)."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-ac", "2", "-ar", str(RATE),
                          "-f", "f32le", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)


def paste(dst: Image.Image, sprite: Image.Image, x: float, y: float, alpha: float = 1.0) -> None:
    """Draw an RGBA sprite onto dst with its top-left at (x, y), faded by alpha."""
    if alpha <= 0:
        return
    if alpha < 1:
        sprite = sprite.copy()
        sprite.putalpha(sprite.getchannel("A").point(lambda a: int(a * alpha)))
    dst.paste(sprite, (round(x), round(y)), sprite)


def transformed(sprite: Image.Image, scale: float = 1.0, angle: float = 0.0) -> Image.Image:
    if abs(scale - 1) > 1e-3:
        w, h = sprite.size
        sprite = sprite.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.Resampling.BILINEAR)
    if abs(angle) > 0.05:
        sprite = sprite.rotate(-angle, resample=Image.Resampling.BICUBIC, expand=True)
    return sprite


def paste_centered(dst, sprite, cx, cy, alpha=1.0, scale=1.0, angle=0.0):
    s = transformed(sprite, scale, angle)
    paste(dst, s, cx - s.width / 2, cy - s.height / 2, alpha)


# ---------- The look of the card ----------


class Look:
    """Sizes, fonts and backgrounds for one output size. U turns the card's CSS px into
    video px: the card is laid out as if on a 720 px tall screen."""

    def __init__(self, height: int):
        self.H = height
        self.W = round(height * 16 / 9 / 2) * 2
        self.U = height / 720
        self.bg = self._background()

    def px(self, css: float) -> int:
        return max(1, round(css * self.U))

    @lru_cache(maxsize=None)
    def font(self, name: str, css: float, weight: int | None = None) -> ImageFont.FreeTypeFont:
        files = {"outfit": "outfit-latin.woff2", "pacifico": "pacifico-latin.woff2"}
        f = ImageFont.truetype(str(FONTS / files[name]), self.px(css))
        if weight is not None:
            try:
                f.set_variation_by_axes([weight])
            except OSError:
                pass
        return f

    def _background(self) -> Image.Image:
        """The card's background: a purple gradient with a pink glow top-left and a teal one
        bottom-right (.bd in birthday.css)."""
        W, H = self.W, self.H
        y, x = np.mgrid[0:H, 0:W].astype(np.float32)
        a = math.radians(160)
        dx, dy = math.sin(a), -math.cos(a)
        length = abs(W * dx) + abs(H * dy)
        p = np.clip(((x - W / 2) * dx + (y - H / 2) * dy) / length + 0.5, 0, 1)
        stops = [(0.0, (0x1B, 0x10, 0x35)), (0.55, (0x3A, 0x1C, 0x5C)), (1.0, (0x5A, 0x24, 0x66))]
        img = np.zeros((H, W, 3), np.float32)
        for c in range(3):
            img[..., c] = np.interp(p, [s[0] for s in stops], [s[1][c] for s in stops])

        def glow(cx, cy, color, alpha, reach):
            rx = max(cx, W - cx) * math.sqrt(2)
            ry = max(cy, H - cy) * math.sqrt(2)
            d = np.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2)
            k = (alpha * np.clip(1 - d / reach, 0, 1))[..., None]
            return img * (1 - k) + np.array(color, np.float32) * k

        img = glow(0.2 * W, 0, PINK, 0.35, 0.55)
        img = glow(0.9 * W, H, TEAL, 0.25, 0.5)
        return Image.fromarray(img.clip(0, 255).astype(np.uint8), "RGB")

    @lru_cache(maxsize=None)
    def _bubble(self, size: int) -> Image.Image:
        s = Image.new("L", (size * 2, size * 2), 0)
        d = ImageDraw.Draw(s)
        for r in range(size, 0, -1):  # radial-gradient(white .5 -> transparent 70%)
            k = r / size
            d.ellipse([size - r, size - r, size + r, size + r], fill=int(255 * 0.5 * clamp01(1 - k / 0.7)))
        out = Image.new("RGBA", s.size, (255, 255, 255, 0))
        out.putalpha(s)
        return out.resize((size, size), Image.Resampling.LANCZOS)

    def sky(self, t: float) -> Image.Image:
        """The background with the soft bubbles drifting up (.bd-sky)."""
        img = self.bg.copy()
        for n in range(14):
            period = 14 + n
            k = EASE_IN_OUT(1 - abs((t / period) % 2 - 1))  # alternate
            size = self.px(14 + n * 3)
            x = self.W * n * 0.073 + self.px(20) * k
            y = self.H * (1 - n * 0.067) - self.px(60) * k
            paste(img, self._bubble(size), x, y, 0.35 + (0.1 - 0.35) * k)
        return img

    @lru_cache(maxsize=None)
    def balloon(self, color: tuple, scale: float = 1.0) -> Image.Image:
        """One balloon with its knot and string (.bd-balloon), drawn big and shrunk for
        smooth edges. The balloon's body is the top 80 css px of the sprite."""
        ss = 4
        u = self.U * scale * ss
        bw, bh, string = 64 * u, 80 * u, 70 * u
        w, h = math.ceil(bw), math.ceil(bh + 6 * u + string)
        img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        cx = bw / 2
        d.line([cx, bh, cx, bh + 6 * u + string], fill=(255, 255, 255, 128), width=max(1, round(u)))
        d.polygon([(cx - 5 * u, bh + 6 * u), (cx + 5 * u, bh + 6 * u), (cx, bh - 3 * u)], fill=color)
        body = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        bd = ImageDraw.Draw(body)
        bd.ellipse([0, 0, bw, bh], fill=color)
        # The shade on the bottom right (inset box-shadow).
        shade = Image.new("L", (w, h), 0)
        sd = ImageDraw.Draw(shade)
        sd.ellipse([0, 0, bw, bh], fill=31)
        sd.ellipse([-8 * u, -10 * u, bw - 8 * u, bh - 10 * u], fill=0)
        body = Image.composite(Image.new("RGBA", (w, h), (0, 0, 0, 255)), body, shade)
        mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, bw, bh], fill=255)
        body.putalpha(mask)
        # The shine, top left.
        shine = Image.new("L", (w, h), 0)
        r = 0.22 * math.hypot(bw, bh) / math.sqrt(2)
        sx, sy = 0.32 * bw, 0.28 * bh
        ImageDraw.Draw(shine).ellipse([sx - r, sy - r, sx + r, sy + r], fill=166)
        shine = shine.filter(ImageFilter.GaussianBlur(r / 2.5))
        body = Image.composite(Image.new("RGBA", (w, h), (255, 255, 255, 255)), body,
                               Image.fromarray((np.asarray(shine) * (np.asarray(mask) / 255)).astype(np.uint8)))
        body.putalpha(mask)
        img.alpha_composite(body)
        return img.resize((max(1, w // ss), max(1, h // ss)), Image.Resampling.LANCZOS)


def text_sprite(text: str, font, fill, glow: tuple | None = None, glow_px: int = 0,
                drop: tuple | None = None, drop_px: int = 0, spacing: float = 0.0) -> Image.Image:
    """Text as an RGBA sprite, with an optional soft glow and a hard drop shadow."""
    mask = text_mask(text, font, spacing)
    pad = glow_px * 3 + drop_px
    w, h = mask.width + pad * 2, mask.height + pad * 2
    big = Image.new("L", (w, h), 0)
    big.paste(mask, (pad, pad))
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    if glow:
        g = big.filter(ImageFilter.GaussianBlur(glow_px / 2))
        g = g.point(lambda a: int(a * glow[3]))
        layer = Image.new("RGBA", (w, h), glow[:3] + (0,))
        layer.putalpha(g)
        out.alpha_composite(layer)
    if drop:
        layer = Image.new("RGBA", (w, h), drop[:3] + (0,))
        shifted = Image.new("L", (w, h), 0)
        shifted.paste(big, (0, drop_px))
        layer.putalpha(shifted.point(lambda a: int(a * drop[3])))
        out.alpha_composite(layer)
    layer = Image.new("RGBA", (w, h), tuple(fill[:3]) + (0,))
    layer.putalpha(big)
    out.alpha_composite(layer)
    return out


def text_mask(text: str, font, spacing: float = 0.0) -> Image.Image:
    """The text's shape (L mode), cropped to its line box."""
    asc, desc = font.getmetrics()
    if spacing:
        widths = [font.getlength(c) + spacing for c in text]
        width = sum(widths) - spacing
    else:
        width = font.getlength(text)
    pad = round(font.size * 0.3)  # script fonts reach outside their box
    m = Image.new("L", (math.ceil(width) + pad * 2, asc + desc + pad), 0)
    d = ImageDraw.Draw(m)
    if spacing:
        x = pad
        for c, w in zip(text, widths):
            d.text((x, pad // 2), c, font=font, fill=255)
            x += w
    else:
        d.text((pad, pad // 2), text, font=font, fill=255)
    return m


def wrap(text: str, font, width: float) -> list[str]:
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if line and font.getlength(trial) > width:
            lines.append(line)
            line = word
        else:
            line = trial
    if line:
        lines.append(line)
    return lines


def rise_in(u: float, delay: float = 0.0, dur: float = 0.8, curve=RISE):
    """bd-rise-in: (opacity, dy in css px, scale) at u seconds."""
    k = clamp01((u - delay) / dur)
    e = curve(k)
    return clamp01(e), 30 * (1 - e), 0.9 + 0.1 * e


# ---------- Scenes: each draws its own frames ----------


class Scene:
    """Part of the film. frame(u) draws it u seconds in (u can run past dur while the next
    scene fades in on top). fade: how long this scene takes to fade in over the last."""

    dur = 0.0
    fade = 0.0
    sound: Path | None = None  # a clip whose sound plays (the music steps aside)

    def frame(self, u: float) -> Image.Image:
        raise NotImplementedError

    def done(self) -> None:
        pass


def stage_for(look: Look, still: Image.Image, box: tuple[int, int] | None = None,
              shadow: bool = True) -> Image.Image:
    """A slide's backdrop: the picture itself, blurred and darkened, filling the screen,
    with a shadow where the picture will sit (.bd-slide-blur)."""
    W, H = look.W, look.H
    small = (W // 8, H // 8)
    k = max(small[0] / still.width, small[1] / still.height) * 1.08
    cover = still.resize((math.ceil(still.width * k), math.ceil(still.height * k)), Image.Resampling.BILINEAR)
    left, top = (cover.width - small[0]) // 2, (cover.height - small[1]) // 2
    cover = cover.crop((left, top, left + small[0], top + small[1]))
    cover = cover.filter(ImageFilter.GaussianBlur(28 * look.U / 8))
    cover = ImageEnhance.Color(ImageEnhance.Brightness(cover).enhance(0.5)).enhance(1.2)
    bg = cover.resize((W, H), Image.Resampling.BICUBIC)
    if shadow and box:
        bw, bh = box
        q = 4
        m = Image.new("L", (W // q, H // q), 0)
        x0, y0 = (W - bw) / 2 / q, ((H - bh) / 2 + look.px(10)) / q
        ImageDraw.Draw(m).rectangle([x0, y0, x0 + bw / q, y0 + bh / q], fill=128)
        m = m.filter(ImageFilter.GaussianBlur(look.px(20) / q)).resize((W, H), Image.Resampling.BILINEAR)
        bg = Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), bg, m)
    return bg


def contain(w: int, h: int, W: int, H: int) -> tuple[int, int]:
    k = min(W / w, H / h)
    return max(2, round(w * k / 2) * 2), max(2, round(h * k / 2) * 2)


class Photo(Scene):
    """A slideshow photo: fits the screen, and zooms in slowly (bd-zoom: 1 -> 1.06 over
    photoSeconds + 1)."""

    def __init__(self, look: Look, path: Path, seconds: float, zoom: bool = True, fade: float = SLIDE_FADE):
        self.look, self.path, self.dur, self.zoom, self.fade = look, path, seconds, zoom, fade
        self.zoom_secs = seconds + 1
        self._ready = False

    def _load(self):
        with Image.open(self.path) as im:
            still = im.convert("RGB")
        self.box = contain(still.width, still.height, self.look.W, self.look.H)
        top = 1.06 if self.zoom else 1.0
        self.big = still.resize((round(self.box[0] * top), round(self.box[1] * top)), Image.Resampling.LANCZOS)
        self.stage = stage_for(self.look, still, self.box, shadow=self.zoom)
        self._ready = True

    def frame(self, u):
        if not self._ready:
            self._load()
        img = self.stage.copy()
        if self.zoom:
            s = 1 + 0.06 * clamp01(u / self.zoom_secs)
            w, h = round(self.box[0] * s), round(self.box[1] * s)
            pic = self.big if (w, h) == self.big.size else self.big.resize((w, h), Image.Resampling.BILINEAR)
        else:
            pic = self.big
        img.paste(pic, ((self.look.W - pic.width) // 2, (self.look.H - pic.height) // 2))
        return img

    def done(self):
        self.stage = self.big = None
        self._ready = False


class Clip(Scene):
    """A video clip, played to the end on its blurred poster; frames are read from ffmpeg
    as they're needed."""

    fade = SLIDE_FADE

    def __init__(self, look: Look, path: Path, poster: Path, w: int, h: int, sound: bool):
        self.look, self.path, self.poster = look, path, poster
        self.dur = duration_of(path)
        self.sound = path if sound and has_audio(path) else None
        self.box = contain(w, h, look.W, look.H)
        self.proc = None
        self.read = 0
        self.last = None

    def frame(self, u):
        if self.proc is None and self.last is None:
            with Image.open(self.poster) as im:
                self.stage = stage_for(self.look, im.convert("RGB"), shadow=False)
            bw, bh = self.box
            self.proc = subprocess.Popen(
                ["ffmpeg", "-v", "error", "-i", str(self.path), "-an", "-vf", f"fps={FPS},scale={bw}:{bh}",
                 "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
        want = int(u * FPS)
        while self.proc and self.read <= want:
            raw = self.proc.stdout.read(self.box[0] * self.box[1] * 3)
            if len(raw) < self.box[0] * self.box[1] * 3:
                self._close()
                break
            self.read += 1
            self.last = Image.frombytes("RGB", self.box, raw)
        img = self.stage.copy()
        if self.last:
            img.paste(self.last, ((self.look.W - self.box[0]) // 2, (self.look.H - self.box[1]) // 2))
        return img

    def _close(self):
        if self.proc:
            if self.proc.poll() is None:
                self.proc.kill()
            self.proc.stdout.close()
            self.proc.wait()
            self.proc = None

    def done(self):
        self._close()
        self.last = self.stage = None


class Envelope(Scene):
    """The sealed envelope, bobbing; then it opens (the flap swings up, the letter peeks
    out, it all grows and fades), just as when it's tapped."""

    def __init__(self, look: Look, name: str, age):
        self.look = look
        self.wait = ENVELOPE_WAIT
        self.dur = ENVELOPE_WAIT + 1.5  # the card moves on 1.5 s after the tap
        U = look.U
        k = 1.4  # the envelope, a little bigger than on a phone
        ew = round(420 * U * k)
        eh = round(ew * 2 / 3)
        self.ew, self.eh, self.k = ew, eh, k
        r = round(10 * U * k)
        ss = 2  # draw big, then shrink, for smooth edges

        def layer(draw_fn):
            img = Image.new("RGBA", (ew * ss, eh * ss), (0, 0, 0, 0))
            draw_fn(ImageDraw.Draw(img), ss)
            return img.resize((ew, eh), Image.Resampling.LANCZOS)

        self.back = layer(lambda d, s: d.rounded_rectangle([0, 0, ew * s, eh * s], r * s, fill=(0xE8, 0x48, 0x7F)))

        # The letter, with "Happy Birthday!" near its top.
        lw, lh = round(ew * 0.88), round(eh * 0.84)
        letter = Image.new("RGBA", (lw, lh), (0, 0, 0, 0))
        ImageDraw.Draw(letter).rounded_rectangle([0, 0, lw - 1, lh - 1], round(6 * U * k), fill=PAPER)
        words = text_sprite("Happy Birthday!", look.font("pacifico", 28.8 * k), (0x6A, 0x2A, 0x6E))
        paste(letter, words, (lw - words.width) / 2, lh * 0.06 - look.px(4 * k))
        self.letter, self.letter_at = letter, (round(ew * 0.06), round(eh * 0.08))

        # The front pocket: a pink gradient, cut away at the top where the flap goes.
        grad = np.zeros((eh, ew, 3), np.float32)
        yy, xx = np.mgrid[0:eh, 0:ew].astype(np.float32)
        a = math.radians(160)
        p = np.clip(((xx - ew / 2) * math.sin(a) - (yy - eh / 2) * math.cos(a))
                    / (abs(ew * math.sin(a)) + abs(eh * math.cos(a))) + 0.5, 0, 1)
        for c, vals in enumerate(zip((0xFF, 0x7D, 0xB6), (0xFF, 0x5F, 0xA2), (0xF0, 0x50, 0x8F))):
            grad[..., c] = np.interp(p, [0, 0.6, 1], vals)
        front = Image.fromarray(grad.astype(np.uint8)).convert("RGBA")
        cut = Image.new("L", (ew * ss, eh * ss), 0)
        ImageDraw.Draw(cut).polygon([(0, 0), (ew * ss / 2, eh * ss * 0.58), (ew * ss, 0), (ew * ss, eh * ss),
                                     (0, eh * ss)], fill=255)
        rounded = Image.new("L", (ew * ss, eh * ss), 0)
        ImageDraw.Draw(rounded).rounded_rectangle([0, 0, ew * ss, eh * ss], r * ss, fill=255)
        cut = Image.fromarray(np.minimum(np.asarray(cut), np.asarray(rounded))).resize((ew, eh), Image.Resampling.LANCZOS)
        front.putalpha(cut)
        to = text_sprite(f"For {name}" if name else "For you", look.font("pacifico", 32 * k), (255, 255, 255),
                         drop=(0x6A, 0x2A, 0x6E, 0.6), drop_px=look.px(2 * k))
        paste(front, to, (ew - to.width) / 2, eh * 0.93 - to.height)
        self.front = front

        self.flap = layer(lambda d, s: d.polygon([(0, 0), (ew * s, 0), (ew * s / 2, eh * s * 0.58)],
                                                 fill=(0xFF, 0x8A, 0xC0)))
        self.flap = self.flap.crop((0, 0, ew, round(eh * 0.58)))

        # The gold seal, with the age on it.
        sd = round(54.4 * U * k)
        seal = Image.new("RGBA", (sd * ss, sd * ss), (0, 0, 0, 0))
        g = Image.new("RGB", (sd * ss, sd * ss))
        gy, gx = np.mgrid[0 : sd * ss, 0 : sd * ss].astype(np.float32)
        dist = np.clip(np.hypot(gx - 0.35 * sd * ss, gy - 0.35 * sd * ss) / (sd * ss * 0.9), 0, 1)[..., None]
        g = Image.fromarray((np.array([0xFF, 0xE0, 0x8A]) * (1 - dist) + np.array([0xE0, 0xA5, 0x26]) * dist)
                            .astype(np.uint8))
        m = Image.new("L", g.size, 0)
        ImageDraw.Draw(m).ellipse([0, 0, sd * ss - 1, sd * ss - 1], fill=255)
        seal.paste(g, (0, 0), m)
        seal = seal.resize((sd, sd), Image.Resampling.LANCZOS)
        label = text_sprite(str(age) if age is not None else "♥", look.font("outfit", 20.8 * k, 800),
                            (0x6A, 0x2A, 0x6E))
        paste(seal, label, (sd - label.width) / 2, (sd - label.height) / 2 + look.px(1))
        self.seal = seal

        # Its shadow, under the whole envelope.
        pad = look.px(60 * k)
        sh = Image.new("L", (ew + pad * 2, eh + pad * 2), 0)
        ImageDraw.Draw(sh).rounded_rectangle([pad, pad + look.px(24 * k), pad + ew, pad + eh + look.px(24 * k)], r,
                                             fill=int(255 * 0.45))
        sh = sh.filter(ImageFilter.GaussianBlur(look.px(25 * k)))
        self.shadow = Image.new("RGBA", sh.size, (0, 0, 0, 0))
        self.shadow.putalpha(sh)
        self.shadow_pad = pad

    def _envelope(self, o: float) -> Image.Image:
        """The envelope o seconds after it was tapped (o < 0: not yet)."""
        ew, eh = self.ew, self.eh
        top = round(eh * 0.6)  # room above for the letter and the open flap
        pad = self.shadow_pad
        img = Image.new("RGBA", (ew + pad * 2, eh + top + pad), (0, 0, 0, 0))
        ox, oy = pad, top
        img.alpha_composite(self.shadow, (0, oy - pad))
        img.alpha_composite(self.back, (ox, oy))
        flap_turn = EASE_IN(clamp01(o / 0.6)) if o >= 0 else 0.0
        letter_up = LETTER_UP(clamp01((o - 0.5) / 0.7)) if o >= 0 else 0.0
        lx, ly = self.letter_at
        ly = ly - self.letter.height * 0.55 * letter_up

        def flap():
            c = math.cos(math.pi * flap_turn)
            fh = max(1, round(self.flap.height * abs(c)))
            f = self.flap.resize((ew, fh), Image.Resampling.BILINEAR)
            if c >= 0:
                img.alpha_composite(f, (ox, oy))
            else:
                img.alpha_composite(f.transpose(Image.Transpose.FLIP_TOP_BOTTOM), (ox, oy - fh))

        if o >= 0:  # once open, the flap is behind the letter
            flap()
        img.alpha_composite(self.letter, (ox + lx, round(oy + ly)))
        img.alpha_composite(self.front, (ox, oy))
        if o < 0:
            flap()
        seal_k = clamp01(o / 0.3) if o >= 0 else 0.0
        s = transformed(self.seal, 1 + 0.6 * seal_k)
        paste(img, s, ox + ew / 2 - s.width / 2, oy + eh * 0.58 - s.height / 2, 1 - seal_k)
        return img

    def frame(self, u):
        look = self.look
        img = look.sky(u)
        o = u - self.wait
        env = self._envelope(o)
        # Centre the envelope itself: its canvas has room above for the letter and flap.
        body_mid = round(self.eh * 0.6) + self.eh / 2
        cy = look.H / 2 + look.px(20) + (env.height / 2 - body_mid)
        if o < 0:  # bd-bob: up 8 px and tilted 1 deg at the half-way point, every 2.4 s
            k = EASE_IN_OUT(1 - abs((u / 2.4) % 1 * 2 - 1))
            paste_centered(img, env, look.W / 2, cy - look.px(8 * self.k) * k, angle=-1 * k)
        else:  # bd-away: grow and fade, from 1 s after the tap
            k = EASE_IN(clamp01((o - 1) / 0.6))
            paste_centered(img, env, look.W / 2, cy, alpha=1 - k, scale=1 + 0.3 * k)
        return img


def balloon_float(look: Look, n: int, t: float) -> tuple[float, float]:
    """Where rising balloon n is at time t (bd-float), as an offset in px."""
    dur = 9 + (n * 7) % 6
    delay = -((n * 1.7) % 9)
    sway = look.px(14 if n % 2 else -14)
    k = ((t - delay) / dur) % 1
    if k < 0.5:
        e = k / 0.5
        return sway * e, -0.6 * look.H * e
    e = (k - 0.5) / 0.5
    return sway * (1 - e), -0.6 * look.H + (-(look.H + look.px(260)) + 0.6 * look.H) * e


class Message(Scene):
    """The message on its paper, rising in, with a ceiling of balloons dropping past it;
    then the countdown to the selfies."""

    fade = SLIDE_FADE

    def __init__(self, look: Look, card: dict, countdown: bool):
        self.look = look
        self.countdown = countdown
        words = sum(len(p.split()) for p in card["message"])
        self.read = min(max(words / 3 + 4, 8.0), 40.0)
        self.dur = self.read + (COUNT_FROM if countdown else 2.0)
        U = look.U
        k = 1.6  # bigger than on a phone, so it reads on a TV
        width = round(560 * U * k)
        pad_x, pad_top, pad_bottom = round(1.6 * 16 * U * k), round(2 * 16 * U * k), round(1.6 * 16 * U * k)
        body = look.font("outfit", 1.12 * 16 * k, 400)
        head = look.font("pacifico", 1.9 * 16 * k)
        sign = look.font("pacifico", 1.35 * 16 * k)
        line_h = round(body.size * 1.6)

        # (sprite, gap above, how far its drawing pads it on the left)
        parts = [(text_sprite(f"Dear {card['name']}," if card["name"] else "Dear you,", head, (0xC2, 0x18, 0x5B)),
                  0, round(head.size * 0.3))]
        for n, p in enumerate(card["message"]):
            for m, line in enumerate(wrap(p, body, width - pad_x * 2)):
                s = text_mask(line, body)
                sprite = Image.new("RGBA", (s.width, line_h), (0x3B, 0x23, 0x46, 0))
                tmp = Image.new("L", (s.width, line_h), 0)
                tmp.paste(s, (0, (line_h - s.height) // 2))
                sprite.putalpha(tmp)
                gap = round(body.size * (0.8 if n == 0 else 1.0)) if m == 0 else 0
                parts.append((sprite, gap, round(body.size * 0.3)))
        if card.get("from"):
            gap = round(1.4 * 16 * U * k)
            for m, line in enumerate(["Love,", card["from"]]):
                s = text_sprite(line, sign, (0x6A, 0x2A, 0x6E))
                parts.append((s, gap if m == 0 else -round(sign.size * 0.35), round(sign.size * 0.3)))
        height = pad_top + sum(s.height + g for s, g, _ in parts) + pad_bottom
        paper = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        ImageDraw.Draw(paper).rounded_rectangle([0, 0, width - 1, height - 1], round(14 * U * k), fill=PAPER)
        y = pad_top
        for s, g, left in parts:
            y += g
            paper.alpha_composite(s, (max(0, pad_x - left), y))
            y += s.height
        # Its shadow.
        sp = look.px(50)
        shadow = Image.new("L", (width + sp * 2, height + sp * 2), 0)
        ImageDraw.Draw(shadow).rounded_rectangle([sp, sp + look.px(20), sp + width, sp + height + look.px(20)],
                                                 look.px(14), fill=int(255 * 0.4))
        shadow = shadow.filter(ImageFilter.GaussianBlur(look.px(25)))
        self.paper_h = height
        sheet = Image.new("RGBA", shadow.size, (0, 0, 0, 0))
        sheet.putalpha(shadow)
        sheet.alpha_composite(paper, (sp, sp))
        max_h = look.H * 0.78
        if sheet.height > max_h:  # a long message: shrink the paper to fit
            self.paper_h = round(self.paper_h * max_h / sheet.height)
            sheet = transformed(sheet, max_h / sheet.height)
        self.sheet = sheet
        self.credit = None
        if card.get("musicCredit"):
            self.credit = credit_sprite(look, card["musicCredit"])
        self.numbers = {n: text_sprite(str(n), look.font("pacifico", 80 * 1.2), GOLD, glow=GOLD + (0.7,),
                                       glow_px=look.px(18)) for n in range(1, COUNT_FROM + 1)}

    def frame(self, u):
        look = self.look
        img = look.sky(u)
        count_h = look.px(96 * 1.2) if self.countdown else 0
        cy = look.H / 2 - count_h / 2 - look.px(10)
        alpha, dy, s = rise_in(u, 0, 0.7, PAPER_RISE)
        paste_centered(img, self.sheet, look.W / 2, cy + look.px(dy), alpha, s)
        if self.countdown and u >= self.read:  # bd-tick: 5, 4, 3, 2, 1, one a second
            c = u - self.read
            n = COUNT_FROM - int(c)
            if n >= 1:
                k = c % 1
                if k < 0.25:
                    e = EASE_OUT(k / 0.25)
                    a, sc = e, 2.2 - 1.2 * e
                elif k < 0.88:
                    a, sc = 1.0, 1.0
                else:
                    e = (k - 0.88) / 0.12
                    a, sc = 1 - e, 1 - 0.2 * e
                paste_centered(img, self.numbers[n], look.W / 2, cy + self.paper_h / 2 + count_h / 2 + look.px(4),
                               a, sc)
        if self.credit:
            paste(img, self.credit, (look.W - self.credit.width) / 2, look.H - self.credit.height - look.px(14), 0.7)
        balloon_drop(img, look, u)
        return img


def balloon_drop(img: Image.Image, look: Look, u: float) -> None:
    """26 balloons tumbling down from the ceiling and away (bd-fall)."""
    for n in range(26):
        x = look.W * (((n * 41) % 96) - 2) / 100
        dur = 4.5 + ((n * 13) % 7) * 0.4
        delay = (n * 0.37) % 2.6
        sway = look.px((1 if n % 2 else -1) * (10 + ((n * 5) % 20)))
        tilt = ((n * 17) % 30) - 15
        size = round(0.8 + ((n * 7) % 5) * 0.1, 1)
        k = (u - delay) / dur
        if k < 0 or k >= 1:
            continue
        keys = [(0, 0, 0, tilt), (0.3, sway, 0.32 * look.H, -tilt), (0.65, -sway, 0.7 * look.H, tilt),
                (1, sway, look.H + look.px(360), -tilt)]
        for (k0, x0, y0, r0), (k1, x1, y1, r1) in zip(keys, keys[1:]):
            if k0 <= k <= k1:
                e = FALL((k - k0) / (k1 - k0))
                dx, dy, rot = x0 + (x1 - x0) * e, y0 + (y1 - y0) * e, r0 + (r1 - r0) * e
                break
        plain = look.balloon(BALLOON_COLORS[n % len(BALLOON_COLORS)], size)
        sprite = transformed(plain, 1, rot)
        # CSS: the balloon's 64 x 80 box starts at top: -180px; (cx, cy) is its middle.
        cx = x + look.px(32) + dx
        cy = -look.px(180) + look.px(40) + dy
        top = cy - 40 * size * look.U - (sprite.height - plain.height) / 2
        paste(img, sprite, cx - sprite.width / 2, top)


def ink_rows(img: Image.Image) -> tuple[int, int]:
    """The first and last rows with solid ink (glows and padding don't count)."""
    a = np.asarray(img.getchannel("A") if img.mode == "RGBA" else img)
    rows = np.nonzero((a > 210).any(axis=1))[0]
    return (int(rows[0]), int(rows[-1]) + 1) if len(rows) else (0, img.height)


def credit_sprite(look: Look, text: str) -> Image.Image:
    font = look.font("outfit", 0.85 * 16 * 1.3, 400)
    lines = wrap(text, font, look.W * 0.8)
    sprites = [text_sprite(line, font, SOFT) for line in lines]
    w = max(s.width for s in sprites)
    h = sum(s.height for s in sprites)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    y = 0
    for s in sprites:
        out.alpha_composite(s, ((w - s.width) // 2, y))
        y += s.height
    return out


class ReelIntro(Scene):
    """The title card before the selfies: 🤳 and the bonus link's words."""

    fade = SLIDE_FADE

    def __init__(self, look: Look, title: str):
        self.look = look
        self.dur = REEL_INTRO
        font = look.font("pacifico", 2.8 * 16 * 1.4)
        lines = wrap(title, font, look.W * 0.72)
        sprites = [text_sprite(line, font, (255, 255, 255), glow=PINK + (0.7,), glow_px=look.px(18)) for line in lines]
        step = round(font.size * 1.35)
        w = max(s.width for s in sprites)
        h = step * (len(sprites) - 1) + sprites[-1].height
        block = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        for n, s in enumerate(sprites):
            block.alpha_composite(s, ((w - s.width) // 2, n * step))
        self.title = block
        self.emoji = emoji_sprite("🤳", look.px(64 * 1.4))

    def frame(self, u):
        look = self.look
        img = look.sky(u)
        eh = self.emoji.height if self.emoji else 0
        total = eh + look.px(16) + self.title.height
        top = (look.H - total) / 2
        if self.emoji:
            a, dy, s = rise_in(u, 0, 0.6)
            paste_centered(img, self.emoji, look.W / 2, top + eh / 2 + look.px(dy), a, s)
        a, dy, s = rise_in(u, 0.2, 0.8)
        paste_centered(img, self.title, look.W / 2, top + eh + look.px(16) + self.title.height / 2 + look.px(dy), a, s)
        return img


def emoji_sprite(char: str, size: int) -> Image.Image | None:
    if not EMOJI_FONT.exists():
        return None
    try:
        font = ImageFont.truetype(str(EMOJI_FONT), 109)
        img = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
        ImageDraw.Draw(img).text((10, 10), char, font=font, embedded_color=True)
        box = img.getbbox()
        if not box:
            return None
        img = img.crop(box)
        return img.resize((round(img.width * size / img.height), size), Image.Resampling.LANCZOS)
    except OSError:
        return None


class Finale(Scene):
    """"Happy 15th Birthday <name>" with the shimmering letters, and balloons floating up."""

    fade = SLIDE_FADE

    def __init__(self, look: Look, card: dict):
        self.look = look
        self.dur = FINALE
        k = 1.4
        big = look.font("outfit", 88 * k, 800)
        self.lines = []  # (kind, sprite or mask, delay)
        self.lines.append(("shine", text_mask("HAPPY", big, -0.02 * big.size), 0.0))
        if card.get("age") is not None:
            age = look.font("outfit", 44.8 * k, 300)
            self.lines.append(("plain", text_sprite(ordinal(card["age"]), age, SOFT, spacing=0.3 * age.size), 0.15))
        self.lines.append(("shine", text_mask("BIRTHDAY", big, -0.02 * big.size), 0.3))
        if card.get("name"):
            nf = look.font("pacifico", 96 * k)
            self.lines.append(("plain", text_sprite(card["name"], nf, (255, 255, 255), glow=PINK + (0.8,),
                                                    glow_px=look.px(18), drop=(0x6A, 0x2A, 0x6E, 0.6),
                                                    drop_px=look.px(4)), 0.5))
        self.ink = [ink_rows(thing) for _, thing, _ in self.lines]
        self.credit = credit_sprite(look, card["musicCredit"]) if card.get("musicCredit") else None
        # The rainbow behind the big words: gold, pink, violet, teal, gold, 3x as wide as the
        # words, sliding along (bd-shimmer, 6 s a lap).
        self.strip_w = max(m.width for kind, m, _ in self.lines if kind == "shine") * 3
        xs = np.linspace(0, 1, self.strip_w, dtype=np.float32)
        stops = [GOLD, PINK, VIOLET, TEAL, GOLD]
        strip = np.stack([np.interp(xs, np.linspace(0, 1, 5), [s[c] for s in stops]) for c in range(3)], -1)
        self.strip = np.concatenate([strip, strip], 0).astype(np.uint8)  # twice, to slide around

    def _shine(self, mask: Image.Image, u: float) -> Image.Image:
        w, h = mask.size
        off = int(((u / 6) % 1) * self.strip_w)
        start = (self.strip_w - off) % self.strip_w
        # The gradient sits behind the whole line; each word sees its own slice.
        row = self.strip[start : start + w]
        if len(row) < w:
            row = np.concatenate([row, self.strip[: w - len(row)]], 0)
        rgb = np.broadcast_to(row[None, :, :], (h, w, 3))
        out = Image.fromarray(np.ascontiguousarray(rgb), "RGB").convert("RGBA")
        out.putalpha(mask)
        return out

    def frame(self, u):
        look = self.look
        img = look.sky(u)
        for n in range(9):  # bd-balloons: nine, drifting up, behind the words
            dx, dy = balloon_float(look, n, u)
            x = look.W * (((n * 37) % 90) + 3) / 100
            sprite = look.balloon(BALLOON_COLORS[n % len(BALLOON_COLORS)])
            paste(img, sprite, x + dx, look.H + look.px(160) - look.px(80) + dy)
        sprites = []
        for kind, thing, delay in self.lines:
            sprites.append((self._shine(thing, u) if kind == "shine" else thing, delay))
        gap = look.px(26)
        total = sum(b - t for t, b in self.ink) + gap * (len(sprites) - 1)
        y = (look.H - total) / 2 - look.px(16)
        for (s, delay), (t, b) in zip(sprites, self.ink):
            a, dy, sc = rise_in(u, delay, 0.8)
            # Put the sprite's ink (not its padding) in its slot.
            paste_centered(img, s, look.W / 2, y - t + s.height / 2 + look.px(dy), a, sc)
            y += (b - t) + gap
        if self.credit:
            paste(img, self.credit, (look.W - self.credit.width) / 2, look.H - self.credit.height - look.px(14), 0.7)
        return img


def ordinal(n: int) -> str:
    teen = 11 <= n % 100 <= 13
    return f"{n}{'th' if teen else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


# ---------- Putting it together ----------


def scenes_for(look: Look, card: dict, files: Path) -> list[Scene]:
    scenes: list[Scene] = [Envelope(look, card["name"], card.get("age"))]
    for s in card["slides"]:
        if s["type"] == "photo":
            scenes.append(Photo(look, files / s["src"], card["photoSeconds"]))
        else:
            scenes.append(Clip(look, files / s["src"], files / s["poster"], s["w"], s["h"], s["sound"]))
    bonus = card.get("bonus")
    if card["message"]:
        scenes.append(Message(look, card, countdown=bool(bonus)))
    if bonus:
        scenes.append(ReelIntro(look, bonus["link"]))
        for n, s in enumerate(bonus["slides"]):
            last = n == len(bonus["slides"]) - 1
            scenes.append(Photo(look, files / s["src"], REEL_HOLD if last else (bonus.get("seconds") or FLIP), zoom=False, fade=0))
    scenes.append(Finale(look, card))
    return scenes


def frame_starts(scenes: list[Scene]) -> list[int]:
    """Each scene's first frame (and, last, the film's length in frames)."""
    starts, t = [], 0.0
    for s in scenes:
        starts.append(round(t * FPS))
        t += s.dur
    starts.append(round(t * FPS))
    return starts


def soundtrack(scenes: list[Scene], starts: list[int], music: Path | None, music_from: float) -> np.ndarray:
    """The film's sound: the music, stepping aside (fade, pause) during each clip with sound
    and picking up where it left off after; the clips' own sound; a fade out at the end."""
    total = starts[-1] / FPS
    n = int(total * RATE)
    mix = np.zeros((n, 2), np.float32)
    fade = int(MUSIC_FADE * RATE)

    if music:
        song = decode_audio(music)
        quiet = [(starts[i] / FPS, starts[i + 1] / FPS) for i, s in enumerate(scenes) if s.sound]
        playing, t = [], music_from
        for a, b in quiet:
            if b <= t:
                continue
            if a > t:
                playing.append((t, a))
            t = b
        playing.append((t, total))
        head = 0  # where in the song we are
        for k, (a, b) in enumerate(playing):
            i0 = int(a * RATE)
            length = min(int((b - a) * RATE) + fade, n - i0)
            if length <= 0:
                continue
            idx = (head + np.arange(length)) % len(song)
            gain = np.ones(length, np.float32)
            if k > 0:  # coming back after a clip: fade in
                gain[: min(fade, length)] = np.linspace(0, 1, min(fade, length))
            if b < total:  # stepping aside for a clip: fade out, then pause
                tail = min(fade, length)
                gain[-tail:] *= np.linspace(1, 0, tail)
            mix[i0 : i0 + length] += song[idx] * gain[:, None]
            head += length
        out = int(MUSIC_OUT * RATE)
        mix[-out:] *= np.linspace(1, 0, out)[:, None]

    for i, s in enumerate(scenes):
        if s.sound:
            sound = even_out(decode_audio(s.sound))
            i0 = int(starts[i] / FPS * RATE)
            sound = sound[: n - i0]
            mix[i0 : i0 + len(sound)] += sound
    return soft_limit(mix)


def even_out(sound: np.ndarray, target_db: float = -19.0) -> np.ndarray:
    """Bring a clip's loudness near the music's (phone clips range from whispers to
    shouting), but by no more than 8 dB either way."""
    rms = float(np.sqrt(np.mean(sound**2))) if len(sound) else 0.0
    if rms < 1e-5:
        return sound
    gain_db = min(max(target_db - 20 * math.log10(rms), -8.0), 8.0)
    return sound * (10 ** (gain_db / 20))


def soft_limit(mix: np.ndarray, knee: float = 0.6, ceiling: float = 0.79) -> np.ndarray:
    """Leave everything under the knee alone; round off anything louder so it never clips.
    The ceiling is -2 dB: AAC encoding overshoots loud, limited sound by over 1 dB."""
    out = mix.copy()
    over = np.abs(out) > knee
    room = ceiling - knee
    out[over] = np.sign(out[over]) * (knee + room * np.tanh((np.abs(out[over]) - knee) / room))
    return out


def write_wav(path: Path, samples: np.ndarray) -> None:
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes((samples * 32767).astype("<i2").tobytes())


def main() -> None:
    ap = argparse.ArgumentParser(description="Turn a built birthday card into one video file.")
    ap.add_argument("card", help="the card's folder, e.g. ~/dev/appbep-cards/<card>")
    ap.add_argument("--height", type=int, default=1080, help="video height in px (default 1080)")
    ap.add_argument("--preview", action="store_true", help="quick and small (540p), to check it")
    ap.add_argument("--out", help="where to write it (default <card>/keep/birthday-card.mp4)")
    args = ap.parse_args()

    card_dir = Path(args.card).expanduser().resolve()
    config = json.loads((card_dir / "card.config.json").read_text())
    files = card_dir / "out" / (config.get("id") or "")
    if not (files / "card.json").exists():
        sys.exit(f"Nothing built at {files}: run build.py first.")
    card = json.loads((files / "card.json").read_text())

    height = 540 if args.preview else args.height
    out = Path(args.out).expanduser() if args.out else (
        card_dir / "keep" / ("birthday-card-preview.mp4" if args.preview else "birthday-card.mp4"))
    out.parent.mkdir(parents=True, exist_ok=True)

    look = Look(height)
    scenes = scenes_for(look, card, files)
    starts = frame_starts(scenes)
    total = starts[-1]
    print(f"{len(scenes)} scenes, {total / FPS / 60:.0f}:{total / FPS % 60:04.1f} long, {look.W}x{look.H}")

    music = files / card["music"] if card.get("music") else None
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "sound.wav"
        write_wav(wav, soundtrack(scenes, starts, music, music_from=ENVELOPE_WAIT))

        enc = subprocess.Popen(
            ["ffmpeg", "-v", "error", "-y",
             "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{look.W}x{look.H}", "-r", str(FPS), "-i", "-",
             "-i", str(wav),
             "-map", "0:v", "-map", "1:a",
             "-c:v", "libx264", "-preset", "veryfast" if args.preview else "slow",
             "-crf", "23" if args.preview else "17", "-pix_fmt", "yuv420p", "-profile:v", "high",
             "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
             "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", str(out)],
            stdin=subprocess.PIPE)

        began = time.time()
        k = 0
        for f in range(total):
            while f >= starts[k + 1]:
                if k > 0:
                    scenes[k - 1].done()
                k += 1
            scene = scenes[k]
            u = (f - starts[k]) / FPS
            img = scene.frame(u)
            if k > 0 and scene.fade and u < scene.fade:
                under = scenes[k - 1].frame((f - starts[k - 1]) / FPS)
                img = Image.blend(under, img, EASE(u / scene.fade))
            left = (total - f) / FPS
            if left < END_FADE:
                img = Image.blend(Image.new("RGB", img.size), img, left / END_FADE)
            enc.stdin.write(img.tobytes())
            if f % FPS == 0:
                spent = time.time() - began
                eta = spent / (f + 1) * (total - f)
                print(f"\r{f / total:5.1%}  about {eta / 60:.0f} min to go ", end="", flush=True)
        for s in scenes:
            s.done()
        enc.stdin.close()
        if enc.wait() != 0:
            sys.exit("ffmpeg failed")
    size = out.stat().st_size / 1e6
    print(f"\rDone in {(time.time() - began) / 60:.1f} min: {out} ({size:.0f} MB)")


if __name__ == "__main__":
    main()
