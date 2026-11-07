#!/usr/bin/env python3
"""Build small WOFF2 subsets from locally installed Noto CJK fonts.

Run inside the project venv after installing ``fonttools[woff]``.
The generated fonts are committed; this script is only needed when locale
strings change.  Font locations come from fontconfig so no system-specific
absolute path is stored in the repository.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / "src" / "kisshogi" / "web" / "assets" / "fonts"
LOCALE_DIR = ROOT / "src" / "kisshogi" / "web" / "locales"

PIECES = "歩香桂銀金角飛玉王龍馬と杏圭全"
EXTRA = (
    "一二三四五六七八九成不打同手投了千日詰先後王将棋対局解析棋譜局面編集"
    "時間切れ連続反則宣言持入玉点法勝負引分無制限開始停止設定終了待考"
    "△▲☗☖0123456789:/.,+-()[]{}%×→←↑↓ "
)


def font_path(family: str) -> Path:
    try:
        out = subprocess.check_output(
            ["fc-match", "-f", "%{file}", family],
            text=True,
        ).strip()
    except (OSError, subprocess.CalledProcessError) as exc:
        raise SystemExit(f"fontconfig could not find {family}: {exc}") from exc
    path = Path(out)
    if not path.exists():
        raise SystemExit(f"font not found: {path}")
    return path


def collection_index(path: Path, family: str) -> int:
    for index in range(32):
        try:
            font = TTFont(path, fontNumber=index, lazy=True)
        except Exception:
            break
        try:
            name = font["name"].getDebugName(1) or ""
        finally:
            font.close()
        if name == family:
            return index
    raise SystemExit(f"face {family!r} not found in {path}")


def chars_from_locale(name: str) -> str:
    data = json.loads((LOCALE_DIR / name).read_text(encoding="utf-8"))
    return "".join(str(value) for value in data.values())


def subset_font(family: str, text: str, output: Path) -> None:
    path = font_path(family)
    index = collection_index(path, family)
    font = TTFont(path, fontNumber=index, lazy=False)
    options = subset.Options()
    options.flavor = "woff2"
    options.name_IDs = ["*"]
    options.name_legacy = True
    options.name_languages = ["*"]
    options.layout_features = ["*"]
    options.notdef_outline = True
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    output.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = "woff2"
    font.save(str(output))
    font.close()
    print(f"{output.relative_to(ROOT)}  {output.stat().st_size} bytes")


def main() -> None:
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    ascii_extra = "".join(chr(c) for c in range(32, 127))
    ja_text = chars_from_locale("ja.json") + EXTRA + ascii_extra
    zh_text = chars_from_locale("zh-CN.json") + EXTRA + ascii_extra
    piece_text = PIECES + "成王玉"
    subset_font("Noto Serif CJK JP", piece_text, FONT_DIR / "pieces.woff2")
    subset_font("Noto Sans CJK JP", ja_text, FONT_DIR / "ui-ja.woff2")
    subset_font("Noto Sans CJK SC", zh_text, FONT_DIR / "ui-zh-CN.woff2")


if __name__ == "__main__":
    main()
