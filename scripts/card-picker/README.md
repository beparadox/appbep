# Card picker: birthday cards for appbep.com/birthday/&lt;id&gt;

Everything personal (photos, clips, names, the message) stays in a private cards folder
**outside this repo**, e.g. `~/dev/appbep-cards/<card>/`. These scripts only read it and
write next to it. Nothing here should ever be committed with a real name or photo in it.

## Set up once

- `ffmpeg` and `ffprobe` on the PATH
- Node (for the site, in `web/`: `npm install`)
- A Python venv for the scripts, kept with the cards:

  ```sh
  python3 -m venv ~/dev/appbep-cards/.venv
  ~/dev/appbep-cards/.venv/bin/pip install pillow pillow-heif numpy
  ```

  (Below, `python` means that venv's `python`.)

## Making a card

1. `python prepare.py <card>`: makes previews of everything in `<card>/originals`.
2. `node server.mjs <card>`, then open http://localhost:5288: the picker page. Tick photos, put them in order, trim clips,
   choose sound on/off. It saves `<card>/picks.json`.
3. Write `<card>/card.config.json` (name, age, message, music…; `build.py` describes it),
   then `python build.py <card>`: writes the finished card to `<card>/out/<id>/`.
4. `scripts/card-picker/upload.sh <card>`: puts it online at `appbep.com/birthday/<id>`.

## Keeping a card after it's offline

Two keepsakes, both made from the built card in `<card>/out/<id>/` (so run `build.py` first).
Both go in `<card>/keep/`, and neither is uploaded anywhere.

|                     | What it is                                                                                          | Lasts                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `birthday-card.mp4` | The card played start to finish as a video (1080p, H.264 + AAC)                                     | Plays on any phone, computer or TV, now and for a long time to come                      |
| `birthday-card.zip` | The interactive card: tap the envelope, pop the balloons… Opens in a browser from disk, no internet | As long as browsers run today's web pages, which is very likely years but not guaranteed |

Keep both, and keep copies somewhere other than this computer (cloud storage, a USB stick).

### The video

```sh
python scripts/card-picker/render_video.py ~/dev/appbep-cards/<card> --preview   # 540p, ~1-2 min, to check
python scripts/card-picker/render_video.py ~/dev/appbep-cards/<card>             # 1080p, the keeper
```

It writes `<card>/keep/birthday-card.mp4` (`--preview` writes `birthday-card-preview.mp4`;
`--height 720` or `--out <file>` change the size or where it goes).

It plays the card the way the site does, with nobody tapping:

1. The envelope bobs, then opens. The music starts here, as it does on the tap.
2. The slideshow: each photo for the card's `photoSeconds` with a slow zoom and
   cross-fades; clips play in full with their own sound while the music fades out and
   pauses, then picks up where it left off.
3. The message on its paper, with the balloon drop, then the 5…1 countdown.
4. The bonus photos: their title card, then the flipbook.
5. "Happy *n*th Birthday", with balloons floating up; the music fades out and the picture
   fades to black.

The music credit is shown on the message and at the end, as the licence asks. What the
video can't do: the balloons can't be popped, the confetti is left out, and the bonus
gallery appears only as the flipbook.

For the video only, clips are brought closer to the music's loudness (by up to 8 dB) and
a soft limiter stops peaks from distorting.

### The interactive card (offline)

```sh
python scripts/card-picker/keepsake.py ~/dev/appbep-cards/<card>
```

It builds the card page on its own (`web/vite.keepsake.config.ts`, entry
`web/src/birthday/keepsake.tsx`) and writes:

- `<card>/keep/birthday-card/`: open **`Open the card.html`** in a browser.
- `<card>/keep/birthday-card.zip`: the same folder, zipped. Unzip it, then open the page.

A few things are different from the site, because the page is opened from a file. The
card's data is in `card/card.js`, since a page opened from disk can't fetch JSON. The
script is a plain (IIFE) bundle, since such a page can't load ES modules. The music cuts
in and out around clips instead of fading, since browsers mute Web Audio for files
(`music.ts`).

### Checking them

- Watch the whole video once, with sound.
- Unzip the zip somewhere new, open the page, tap the envelope: the music should start and
  the slideshow should begin.
