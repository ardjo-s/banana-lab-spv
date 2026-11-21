"""Bake animation to PNG, encode H.264, then extract the stills used by the site."""

import argparse
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

cli = argparse.ArgumentParser()
cli.add_argument(
    "work",
    type=Path,
    help="Folder for the editable Blender files and intermediate frames",
)
cli.add_argument("--blender", default="blender", help="Blender 4.5 LTS executable")
cli.add_argument("shots", nargs="*", default=[])
args = cli.parse_intermixed_args()
root = Path(__file__).resolve().parents[1]
out = root / "assets" / "film"
out.mkdir(parents=True, exist_ok=True)
takes = {"cover": 100, "depart": 76, "achat": 76, "marche": 76, "vente": 76}


def finished_png(path):
    if not path.is_file() or path.stat().st_size < 12:
        return False
    with path.open("rb") as stream:
        stream.seek(-12, 2)
        return stream.read() == bytes.fromhex("0000000049454e44ae426082")


if unknown := set(args.shots) - takes.keys():
    cli.error("Unknown shot(s): " + ", ".join(sorted(unknown)))

for shot in args.shots or takes:
    count = takes[shot]
    work = args.work.resolve()
    frames = work / shot
    # Continue from the first incomplete image after an interrupted render.
    first = next(
        (
            i
            for i in range(1, count + 1)
            if not finished_png(frames / f"take-{i:04d}.png")
        ),
        count + 1,
    )
    if first <= count:
        subprocess.run(
            [
                args.blender,
                "-b",
                "--python-exit-code",
                "1",
                "-P",
                str(root / "production" / "film.py"),
                "--",
                shot,
                str(work),
                "--save",
                "--samples",
                "14" if shot == "cover" else "12",
                "--scale",
                "100" if shot == "cover" else "88",
                "--start",
                str(first),
            ],
            check=True,
        )
    with TemporaryDirectory(dir=out) as directory:
        tmp = Path(directory)
        subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-framerate",
                "24",
                "-start_number",
                "1",
                "-i",
                str(frames / "take-%04d.png"),
                "-frames:v",
                str(count),
                "-vf",
                "pad=ceil(iw/2)*2:ceil(ih/2)*2",
                "-c:v",
                "libx264",
                "-preset",
                "slow",
                "-crf",
                "17",
                "-pix_fmt",
                "yuv420p",
                "-movflags",
                "+faststart",
                "-an",
                str(tmp / f"{shot}.mp4"),
            ],
            check=True,
        )
        poster = {"cover": 1, "depart": 26, "achat": 34, "marche": 53, "vente": 53}[
            shot
        ]
        subprocess.run(
            [
                "cwebp",
                "-quiet",
                "-q",
                "92",
                str(frames / f"take-{poster:04d}.png"),
                "-o",
                str(tmp / f"{shot}.webp"),
            ],
            check=True,
        )
        for extension in ("webp", "mp4"):
            asset = tmp / f"{shot}.{extension}"
            asset.replace(out / asset.name)
