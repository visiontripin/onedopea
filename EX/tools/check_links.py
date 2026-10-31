#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EX // ПРОВЕРКА ССЫЛОК И РЕЕСТРА
================================
Одна команда, которая говорит, всё ли в порядке в репозитории:

    python3 EX/tools/check_links.py

Проверяет:
  · относительные ссылки в *.md и *.html (включая .md → .html на сайте)
  · что каждая запись в ledger/encounters.ndjson валидна по schema.json
  · что counter.json не расходится с реальным числом строк в реестре
  · что counter.json — валидный JSON нужной структуры

Код возврата 1, если есть ошибки (годится для CI).
"""

import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EX = ROOT / "EX"

LINK_RE = re.compile(r"\[[^\]\n]*\]\(([^)\s]+)\)")
HREF_RE = re.compile(r"""(?:href|src)\s*=\s*["']([^"']+)["']""")

IGNORE_PREFIX = ("http://", "https://", "mailto:", "tel:", "#", "data:", "/")


def check_links():
    errors, checked = [], 0
    for path in sorted(EX.rglob("*")):
        if path.suffix not in (".md", ".html") or not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        targets = LINK_RE.findall(text) if path.suffix == ".md" else HREF_RE.findall(text)
        for raw in targets:
            if raw.startswith(IGNORE_PREFIX):
                continue
            target = raw.split("#")[0]
            if not target:
                continue
            resolved = (path.parent / target).resolve()
            checked += 1
            exists = resolved.exists()
            # на сайте .md превращается в .html — проверяем оба варианта
            if not exists and target.endswith(".md"):
                exists = resolved.with_suffix(".html").exists()
            if not exists:
                errors.append(f"{path.relative_to(ROOT)} → {raw}")
    return checked, errors


def check_ledger():
    errors = []
    schema_path = EX / "ledger" / "schema.json"
    records_path = EX / "ledger" / "encounters.ndjson"
    counter_path = EX / "ledger" / "counter.json"

    if not schema_path.exists():
        return ["нет ledger/schema.json"]

    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    rows = []
    if records_path.exists():
        for i, line in enumerate(records_path.read_text(encoding="utf-8").splitlines(), 1):
            if not line.strip():
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as e:
                errors.append(f"encounters.ndjson:{i} — невалидный JSON ({e})")

    # мягкая проверка обязательных полей без внешних зависимостей
    required = schema.get("required", [])
    for i, row in enumerate(rows, 1):
        missing = [f for f in required if f not in row]
        if missing:
            errors.append(f"encounters.ndjson:{i} — нет полей: {', '.join(missing)}")
        eid = row.get("encounter_id", "")
        if not re.fullmatch(r"EX-\d{6}", str(eid)):
            errors.append(f"encounters.ndjson:{i} — encounter_id «{eid}» не по формату EX-000000")

    if counter_path.exists():
        counter = json.loads(counter_path.read_text(encoding="utf-8"))
        levels = counter.get("levels", {})
        for code in ("L1", "L2", "L3", "L4"):
            if code not in levels:
                errors.append(f"counter.json — нет уровня {code}")
                continue
            actual = sum(1 for r in rows if r.get("level") == code)
            stated = levels[code].get("count", 0)
            if actual != stated:
                errors.append(f"counter.json — {code}: записано {stated}, в реестре {actual}")
    else:
        errors.append("нет ledger/counter.json")

    return errors


def check_docs_index():
    """Каждый .md в docs/ должен иметь собранную .html-версию."""
    errors = []
    for p in sorted((EX / "docs").glob("*.md")):
        if not p.with_suffix(".html").exists():
            errors.append(f"{p.relative_to(ROOT)} — не собрана страница (запусти build_site.py)")
    for p in sorted(list((EX / "templates").glob("*.md")) + list((EX / "ledger").glob("*.md"))):
        if not p.with_suffix(".html").exists():
            errors.append(f"{p.relative_to(ROOT)} — не собрана страница (запусти build_site.py)")
    return errors


def main():
    checked, link_errors = check_links()
    ledger_errors = check_ledger()
    build_errors = check_docs_index()

    print(f"ссылок проверено: {checked}")
    print(f"страниц без сборки: {len(build_errors)}")
    print(f"ошибок реестра: {len(ledger_errors)}")

    all_errors = link_errors + ledger_errors + build_errors
    if all_errors:
        print("\nНАЙДЕНЫ ПРОБЛЕМЫ:")
        for e in all_errors:
            print("  ·", e)
        return 1

    print("\nвсё в порядке: ссылки живые, реестр сходится со счётчиками")
    return 0


if __name__ == "__main__":
    sys.exit(main())
