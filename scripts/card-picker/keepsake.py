"""
Card picker, keepsake: the card as a folder that opens in a browser straight from disk,
envelope, balloons and all, with no website and no internet.

Reads <card>/out/<id>/ (made by build.py), builds the page (web/vite.keepsake.config.ts)
and writes:

  <card>/keep/birthday-card/        the folder: open "Open the card.html"
  <card>/keep/birthday-card.zip     the same, zipped, to keep or pass on

Nothing is uploaded and nothing is written into the repo.

Usage: python keepsake.py ~/dev/appbep-cards/<card>
"""

import json
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
WEB = REPO / "web"

PAGE = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>A birthday card for you</title>
    <link rel="stylesheet" href="app/keepsake.css" />
  </head>
  <body style="margin: 0; background: #1b1035">
    <div id="root"></div>
    <script src="card/card.js"></script>
    <script src="app/keepsake.js"></script>
  </body>
</html>
"""

README = """A birthday card
===============

Open "Open the card.html" in a web browser (double-click it). Tap the envelope to start.
It works with no internet: everything it needs is in this folder, so keep the folder
together.

birthday-card.mp4, if it's with this, is the same card as a video, for any player.
"""


def main() -> None:
    card_dir = Path(sys.argv[1]).expanduser().resolve()
    config = json.loads((card_dir / "card.config.json").read_text())
    files = card_dir / "out" / (config.get("id") or "")
    if not (files / "card.json").exists():
        sys.exit(f"Nothing built at {files}: run build.py first.")

    subprocess.run(["npx", "vite", "build", "--config", "vite.keepsake.config.ts", "--logLevel", "error"],
                   cwd=WEB, check=True)
    built = WEB / "dist-keepsake"

    keep = card_dir / "keep"
    folder = keep / "birthday-card"
    if folder.exists():
        shutil.rmtree(folder)
    (folder / "app" / "fonts").mkdir(parents=True)

    # The page's code and look; its fonts beside it (the stylesheet asks for /fonts/...).
    shutil.copy(built / "keepsake.js", folder / "app")
    css = (built / "keepsake.css").read_text().replace("url(/fonts/", "url(fonts/")
    (folder / "app" / "keepsake.css").write_text(css)
    for font in (WEB / "public" / "fonts").glob("*.woff2"):
        shutil.copy(font, folder / "app" / "fonts")
    shutil.copy(WEB / "public" / "fonts" / "README.md", folder / "app" / "fonts" / "LICENSES.md")

    # The card: its photos, clips and music, and its words as a script (pages opened from
    # a file can't fetch card.json).
    shutil.copytree(files, folder / "card")
    data = (files / "card.json").read_text()
    (folder / "card" / "card.js").write_text(f"window.CARD = {data};\n")

    (folder / "Open the card.html").write_text(PAGE)
    (folder / "README.txt").write_text(README)

    zip_path = keep / "birthday-card.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_STORED) as z:  # photos and clips don't shrink
        for f in sorted(folder.rglob("*")):
            if f.is_file():
                z.write(f, f.relative_to(keep))
    size = zip_path.stat().st_size / 1e6
    print(f"Done: {folder}\n      {zip_path} ({size:.0f} MB)")
    print(f'Try it: open "{folder / "Open the card.html"}" in a browser.')


if __name__ == "__main__":
    main()
