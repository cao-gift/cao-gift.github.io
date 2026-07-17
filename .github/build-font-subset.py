#!/usr/bin/env python3
"""Build the pinned, self-hosted common subset of LXGW WenKai Screen."""

import argparse
import pathlib
import re
import shutil
import urllib.request


VERSION = "1.7.0"
SUBSETS = tuple(range(109, 120))
BASE_URL = f"https://cdn.jsdelivr.net/npm/lxgw-wenkai-screen-webfont@{VERSION}/"


def download(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Gmeek font subset builder"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def build(target):
    target.mkdir(parents=True, exist_ok=True)
    css = download(BASE_URL + "lxgwwenkaiscreen.css").decode("utf-8")
    blocks = {
        int(match.group(1)): match.group(0)
        for match in re.finditer(
            r"/\* LXGW WenKai Screen \[(\d+)\] \*/\s*@font-face\s*\{.*?\}",
            css,
            flags=re.DOTALL,
        )
    }

    selected = []
    for subset in SUBSETS:
        block = blocks.get(subset)
        if not block:
            raise RuntimeError(f"upstream CSS is missing subset {subset}")
        filename = f"lxgwwenkaiscreen-subset-{subset}.woff2"
        font = download(BASE_URL + "files/" + filename)
        (target / filename).write_bytes(font)
        selected.append(block.replace(f"./files/{filename}", f"./{filename}"))

    header = (
        f"/* LXGW WenKai Screen {VERSION}; common subsets 109-119; SIL Open Font License. */\n"
    )
    (target / "lxgw-wenkai-screen-subset.css").write_text(
        header + "\n".join(selected) + "\n", encoding="utf-8"
    )
    (target / "LXGW-WenKai-Screen-LICENSE.txt").write_bytes(download(BASE_URL + "LICENSE"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sync-docs", action="store_true")
    args = parser.parse_args()
    root = pathlib.Path(__file__).resolve().parents[1]
    source = root / "static" / "fonts"
    build(source)
    if args.sync_docs:
        destination = root / "docs" / "fonts"
        if destination.exists():
            shutil.rmtree(destination)
        shutil.copytree(source, destination)
    print(f"built {len(SUBSETS)} font subsets in {source}")


if __name__ == "__main__":
    main()
