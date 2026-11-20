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

### 1. Start the card folder

Make `~/dev/appbep-cards/<card>/` and put the photos and videos in it, either loose in the
folder or in `<card>/originals/`. Then:

```sh
python scripts/card-picker/prepare.py ~/dev/appbep-cards/<card> --take-new
```

`--take-new` copies the loose files into `<card>/originals/`, read-only, and leaves the loose
ones where they are. Nothing in `originals/` is ever changed. Without `--take-new`, it
only looks in `originals/`. Either way it makes the previews the picker shows, and on a
re-run it only does files it hasn't seen.

### 2. Pick in the picker

```sh
node scripts/card-picker/server.mjs ~/dev/appbep-cards/<card>
```

Open http://localhost:5288. Everything you do is saved as you go to `<card>/picks.json`, and
the save before that is kept as `picks.prev.json`.

- **card** / **bonus** on a tile: put it in the slideshow or the bonus round. Photos and
  videos can go in either.
- **The list on the right** (tabs: The card / Bonus round): drag, or ↑ ↓, to reorder; ✕ to
  take out; **Sort by date** puts it back oldest-first.
- **Click a picture** to see it big: turn it, and for a video set where each section
  starts and ends, turn its sound on or off (off means the music keeps playing under it),
  or use more than one part of it.
- **⛓** on a clip followed by another clip: join them into one video. A silent part gets
  silence, and the music stays off for the whole joined clip if any part has sound.
- **Each photo shows for** sets the slideshow's speed.
- **Look for new photos**: after dropping more files in `<card>/`, takes them in (step 1's
  `--take-new`) and reloads the page. New ones still need ticking.
- **Rebuild the card**: saves, then runs step 4. Hover over a failure to see why.

Keep only one picker page open per card: a page saves its own copy of the picks over the
file, so don't edit `picks.json` by hand while one is open.

### 3. Write `<card>/card.config.json`

```json
{
  "name": "…",
  "age": 1,
  "from": "…",
  "message": "Paragraphs, separated by blank lines.",
  "bonusLink": "Bonus round for …!!!",
  "music": "/path/to/song.mp3",
  "musicCredit": "Music: \"Song\" by Band",
  "localOnly": false
}
```

| Setting        | What it does                                                                                                                                                                                                                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | The link, `appbep.com/birthday/<id>`. Leave it out: the first build makes one up and writes it here.                                                                                                                                                                                                                   |
| `name`, `age`  | On the envelope, the greeting and the message. `age` can be `null`.                                                                                                                                                                                                                                                    |
| `from`         | Signs the message: "Love, …".                                                                                                                                                                                                                                                                                          |
| `message`      | Yours, in your words. Blank lines split paragraphs.                                                                                                                                                                                                                                                                    |
| `bonusLink`    | The words on the link to the bonus gallery, and on the bonus round's opening card.                                                                                                                                                                                                                                     |
| `bonusTitle`   | Optional: different words for the bonus round's opening card.                                                                                                                                                                                                                                                          |
| `bonusSeconds` | Optional: how long each bonus photo shows (a third of a second if left out). Clips play at their own length.                                                                                                                                                                                                           |
| `theme`        | Optional: `"blue"`. Pink if left out.                                                                                                                                                                                                                                                                                  |
| `ending`       | What follows the slideshow. Left out: the message with balloons dropping, a 5…1 countdown, the bonus round, then the "Happy Birthday" balloons. `"bonusRound"`: "Happy Birthday <name>!" with balloons dropping (3 s), "Get ready for the bonus round!" (3 s), the bonus round, then the message with balloons to pop. |
| `music`        | A song file, or `null`. It's evened out and stripped of tags. It loops if the card runs longer.                                                                                                                                                                                                                        |
| `musicCredit`  | Shown small on the message (and in the keepsake video), for songs that ask to be credited.                                                                                                                                                                                                                             |
| `crop`         | Optional: keep only part of a photo, e.g. `{"PXL_….jpg": [0.16, 0.37, 0.48, 0.245]}`: left, top, width, height as fractions of the upright photo. Cut from the original at build time; the picker shows it cropped too.                                                                                                |
| `localOnly`    | `true` while the card has anything that mustn't go online (e.g. stand-in music). `upload.sh` refuses until it's `false`.                                                                                                                                                                                               |

### 4. Build it

```sh
python scripts/card-picker/build.py ~/dev/appbep-cards/<card>
```

(or **Rebuild the card** in the picker). It writes the card to `<card>/out/<id>/`: photos
upright, at most 1600 px, clips cut and sized for phones, everything stripped of
metadata (no GPS, camera or dates) and given hashed names. Re-running only redoes what
changed: seconds for a reorder, a minute or two for new clips.

### 5. Look at it locally

```sh
cd web && CARDS_DIR=~/dev/appbep-cards/<card>/out npx vite --port 5174
```

Open http://localhost:5174/birthday/<id>. Add `--host` to try it on a phone on the same
Wi-Fi (at this computer's address). After a rebuild, reload the page.

### 6. Put it online

```sh
scripts/card-picker/upload.sh ~/dev/appbep-cards/<card>
```

It goes to `appbep.com/birthday/<id>`. The live site has to be deployed with the
card code the card needs first (a new `theme` or `ending`, say), so merge and deploy before
uploading. To change a live card: rebuild, then upload again.

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
4. The bonus round: its title card, then the flipbook.
5. "Happy *n*th Birthday", with balloons floating up; the music fades out and the picture
   fades to black.

With the `"bonusRound"` ending, steps 3–5 are instead: "Happy Birthday _name_!" with the
balloon drop (3 s), "Get ready for the bonus round!" (3 s), the bonus round (photos at
`bonusSeconds`, clips played in full), then the message with balloons floating up, and
the fade to black. A `"blue"` theme recolours the video as it does the card.

The music credit is shown on the message and at the end, as the licence asks.

What the video can't do: the balloons can't be popped, the confetti is left out, and the bonus
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
