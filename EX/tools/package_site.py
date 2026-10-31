#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EX // СБОРКА ПУБЛИКУЕМОГО САЙТА
===============================
Собирает всё, что должно попасть в интернет, в папку `_site/`:

    python3 EX/tools/package_site.py

Что кладёт внутрь:
  index.html          — портфолио ONEDOPEA
  EX/                 — лендинг, презентация, заявка, документы (.md и .html),
                        шаблоны, схема реестра

Чего не кладёт: .git, tools/, тесты, историю, служебные файлы.
Папка `_site/` в git не хранится — она создаётся заново перед публикацией
(так же её собирает GitHub Actions).
"""

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "_site"

INCLUDE_TOP = ["index.html"]
INCLUDE_EX = ["index.html", "deck.html", "join.html"]
INCLUDE_DIRS = ["docs", "templates", "ledger"]
SKIP_SUFFIXES = {".py", ".pyc"}
SKIP_NAMES = {".DS_Store", "Thumbs.db", "__pycache__"}


def copy_tree(src: Path, dst: Path):
    dst.mkdir(parents=True, exist_ok=True)
    for item in sorted(src.iterdir()):
        if item.name in SKIP_NAMES or item.suffix in SKIP_SUFFIXES:
            continue
        target = dst / item.name
        if item.is_dir():
            copy_tree(item, target)
        else:
            shutil.copy2(item, target)


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()

    for name in INCLUDE_TOP:
        src = ROOT / name
        if src.exists():
            shutil.copy2(src, OUT / name)

    ex_src, ex_dst = ROOT / "EX", OUT / "EX"
    ex_dst.mkdir()
    for name in INCLUDE_EX:
        src = ex_src / name
        if src.exists():
            shutil.copy2(src, ex_dst / name)
    for name in INCLUDE_DIRS:
        src = ex_src / name
        if src.exists():
            copy_tree(src, ex_dst / name)

    files = sorted(p for p in OUT.rglob("*") if p.is_file())
    size = sum(p.stat().st_size for p in files) / 1024
    print(f"собрано в _site/: {len(files)} файлов, {size:.0f} КБ")
    for p in files[:40]:
        print("  ·", p.relative_to(ROOT))
    if len(files) > 40:
        print(f"  … и ещё {len(files) - 40}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
