#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EX // СБОРЩИК САЙТА
===================
Превращает markdown-документы проекта в аккуратные HTML-страницы в том же
дизайн-коде, что и лендинг (Antigravity: светлый фон, чёрные пилюли, много воздуха).

Зависимостей нет — только стандартная библиотека.

    python3 EX/tools/build_site.py          # собрать все страницы
    python3 EX/tools/build_site.py --check  # только проверить ссылки, ничего не писать

Что делает:
  · читает все *.md в EX/docs, EX/templates и EX/ledger
  · кладёт рядом *.html с общей шапкой, навигацией и оглавлением
  · переписывает ссылки *.md → *.html внутри страниц
  · собирает EX/docs/index.html — каталог документов
"""

import html
import os
import re
import sys
import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]      # корень репозитория
EX = ROOT / "EX"

# ─────────────────────────────────────────────────────────────
# Markdown (подмножество, достаточное для документов проекта)
# ─────────────────────────────────────────────────────────────

def _inline(text: str) -> str:
    """Инлайн-разметка: код, ссылки, жирный, курсив, зачёркивание."""
    stash = []

    def keep(fragment: str) -> str:
        stash.append(fragment)
        return f"\x00{len(stash) - 1}\x00"

    # 1. инлайн-код прячем первым, чтобы внутри него ничего не размечалось
    text = re.sub(r"`([^`\n]+)`", lambda m: keep("<code>" + html.escape(m.group(1)) + "</code>"), text)
    # 2. ссылки
    def link(m):
        label, href = m.group(1), m.group(2)
        href = _href(href)
        ext = ' target="_blank" rel="noopener"' if href.startswith("http") else ""
        return f'<a href="{html.escape(href, quote=True)}"{ext}>{_inline_min(label)}</a>'
    text = re.sub(r"\[([^\]\n]+)\]\(([^)\s]+)\)", link, text)
    # 3. выделения
    text = re.sub(r"\*\*([^*\n]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![\w*])\*([^*\n]+)\*(?![\w*])", r"<em>\1</em>", text)
    text = re.sub(r"~~([^~\n]+)~~", r"<del>\1</del>", text)
    # 4. возвращаем код
    while "\x00" in text:
        text = re.sub(r"\x00(\d+)\x00", lambda m: stash[int(m.group(1))], text)
    return text


def _inline_min(text: str) -> str:
    """Для текста ссылки: только код и экранирование, без вложенных ссылок."""
    text = re.sub(r"`([^`\n]+)`", lambda m: "<code>" + html.escape(m.group(1)) + "</code>", text)
    return text


def _href(href: str) -> str:
    if href.startswith(("http://", "https://", "mailto:", "#", "/")):
        return href
    if href.endswith(".md"):
        href = href[:-3] + ".html"
    return href


SEP_RE = re.compile(r"^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$")
LIST_RE = re.compile(r"^(\s*)([-*+]|\d+[.)])\s+(.*)$")
HEAD_RE = re.compile(r"^(#{1,6})\s+(.*)$")


def _split_row(row: str):
    row = row.strip()
    if row.startswith("|"):
        row = row[1:]
    if row.endswith("|"):
        row = row[:-1]
    return [c.strip() for c in row.split("|")]


def _task(text: str) -> str:
    text = re.sub(r"^\[ \]\s+", "☐ ", text)
    text = re.sub(r"^\[[xX]\]\s+", "☑ ", text)
    return text


def md_to_html(text: str):
    """Возвращает (html, [(уровень, id, заголовок)])."""
    lines = text.replace("\r\n", "\n").split("\n")
    out, toc = [], []
    i, n = 0, len(lines)

    def close_list(stack):
        while stack:
            out.append(f"</{stack.pop()}>")

    list_stack = []

    while i < n:
        line = lines[i]

        # ── код ──
        if line.lstrip().startswith("```"):
            close_list(list_stack)
            i += 1
            buf = []
            while i < n and not lines[i].lstrip().startswith("```"):
                buf.append(lines[i])
                i += 1
            i += 1
            out.append("<pre><code>" + html.escape("\n".join(buf)) + "</code></pre>")
            continue

        # ── пустая строка ──
        if not line.strip():
            close_list(list_stack)
            i += 1
            continue

        # ── заголовок ──
        m = HEAD_RE.match(line)
        if m:
            close_list(list_stack)
            level = len(m.group(1))
            title = m.group(2).strip()
            anchor = _slug(title)
            if level == 1:
                out.append(f'<h1 id="top">{_inline(title)}</h1>')
            else:
                toc.append((level, anchor, _plain(title)))
                out.append(f'<h{level} id="{anchor}">{_inline(title)}</h{level}>')
            i += 1
            continue

        # ── горизонтальная линия ──
        if re.match(r"^\s*(\*\s*){3,}$|^\s*(-\s*){3,}$|^\s*(_\s*){3,}$", line):
            close_list(list_stack)
            out.append("<hr>")
            i += 1
            continue

        # ── таблица ──
        if "|" in line and i + 1 < n and SEP_RE.match(lines[i + 1]):
            close_list(list_stack)
            head = _split_row(lines[i])
            i += 2
            body = []
            while i < n and "|" in lines[i] and lines[i].strip():
                body.append(_split_row(lines[i]))
                i += 1
            out.append('<div class="tw"><table><thead><tr>'
                       + "".join(f"<th>{_inline(c)}</th>" for c in head)
                       + "</tr></thead><tbody>")
            for row in body:
                out.append("<tr>" + "".join(f"<td>{_inline(c)}</td>" for c in row) + "</tr>")
            out.append("</tbody></table></div>")
            continue

        # ── цитата ──
        if line.lstrip().startswith(">"):
            close_list(list_stack)
            buf = []
            while i < n and lines[i].lstrip().startswith(">"):
                buf.append(re.sub(r"^\s*>\s?", "", lines[i]))
                i += 1
            out.append("<blockquote>" + md_to_html("\n".join(buf))[0] + "</blockquote>")
            continue

        # ── список ──
        m = LIST_RE.match(line)
        if m:
            indent = len(m.group(1).expandtabs(4))
            marker = m.group(2)
            kind = "ol" if marker[0].isdigit() else "ul"
            depth = indent // 2 + 1
            while len(list_stack) > depth:
                out.append(f"</{list_stack.pop()}>")
            if len(list_stack) == depth and list_stack[-1] != kind:
                out.append(f"</{list_stack.pop()}>")
            if len(list_stack) < depth:
                list_stack.append(kind)
                out.append(f"<{kind}>")
            # продолжающиеся строки пункта (перенос длинного текста в списке)
            item_lines = [m.group(3).strip()]
            i += 1
            while i < n:
                nxt = lines[i]
                if not nxt.strip():
                    break
                if LIST_RE.match(nxt) or HEAD_RE.match(nxt) or nxt.lstrip().startswith(("```", ">")):
                    break
                if re.match(r"^\s*\|?\s*:?-{2,}", nxt):
                    break
                if indent and len(nxt) - len(nxt.lstrip()) <= indent and not nxt.startswith(" " * (indent + 1)):
                    break
                item_lines.append(nxt.strip())
                i += 1
            item = _task(" ".join(item_lines))
            out.append(f"<li>{_inline(item)}</li>")
            continue

        # ── абзац ──
        close_list(list_stack)
        buf = [line.strip()]
        i += 1
        while i < n and lines[i].strip() and not HEAD_RE.match(lines[i]) \
                and not LIST_RE.match(lines[i]) and not lines[i].lstrip().startswith(("```", ">")) \
                and not (("|" in lines[i]) and i + 1 < n and SEP_RE.match(lines[i + 1])):
            buf.append(lines[i].strip())
            i += 1
        out.append("<p>" + _inline(" ".join(buf)) + "</p>")

    close_list(list_stack)
    return "\n".join(out), toc


def _plain(s: str) -> str:
    s = re.sub(r"[`*_~]", "", s)
    s = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", s)
    return s.strip()


def _slug(title: str) -> str:
    s = _plain(title).lower()
    s = re.sub(r"[^\w\s\u0400-\u04FF-]", "", s)
    s = re.sub(r"\s+", "-", s.strip())
    return s or "section"


# ─────────────────────────────────────────────────────────────
# Оболочка страницы
# ─────────────────────────────────────────────────────────────

BASE_CSS = """
:root{
  --ink:#121317;--ink-2:#45474d;--ink-3:#7c7f86;
  --line:#e8e8ec;--line-2:#f0f0f3;--wash:#f7f7f9;
  --sans:"Google Sans Flex","Google Sans",Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
}
*{margin:0;padding:0;box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;scroll-padding-top:88px}
body{background:#fff;color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.65;
  letter-spacing:-.006em;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
::selection{background:var(--ink);color:#fff}
.top{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.86);
  backdrop-filter:saturate(1.4) blur(12px);border-bottom:1px solid var(--line)}
.top-in{max-width:1080px;margin:0 auto;padding:12px 24px;display:flex;align-items:center;gap:14px}
.brand{font-weight:600;font-size:16px;letter-spacing:-.03em;display:flex;gap:8px;align-items:center}
.brand i{width:7px;height:7px;border-radius:50%;background:var(--ink);display:inline-block}
.crumb{font-size:13px;color:var(--ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.top .sp{flex:1}
.pill{display:inline-flex;align-items:center;gap:7px;font-size:13.5px;font-weight:500;
  padding:8px 14px;border-radius:999px;border:1px solid var(--line);background:var(--wash);
  transition:background .16s,border-color .16s;white-space:nowrap}
.pill:hover{background:#f1f1f4;border-color:#dcdce2}
.pill.dark{background:var(--ink);color:#fff;border-color:var(--ink)}
.pill.dark:hover{background:#2a2c33}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
.layout{display:grid;grid-template-columns:1fr;gap:40px;padding:44px 0 96px}
@media(min-width:960px){.layout{grid-template-columns:minmax(0,1fr) 240px;gap:56px;align-items:start}}
article{max-width:76ch}
article h1{font-size:clamp(29px,4.6vw,42px);font-weight:500;letter-spacing:-.035em;line-height:1.1;margin-bottom:22px}
article h2{font-size:clamp(21px,2.8vw,27px);font-weight:500;letter-spacing:-.025em;margin:44px 0 14px;line-height:1.2}
article h3{font-size:19px;font-weight:500;letter-spacing:-.015em;margin:32px 0 10px}
article h4{font-size:16px;font-weight:600;margin:24px 0 8px}
article p{color:var(--ink-2);margin:0 0 14px}
article strong{color:var(--ink);font-weight:500}
article em{font-style:normal;border-bottom:1px solid var(--ink-3)}
article a{color:var(--ink);border-bottom:1px solid #c9cad1;transition:border-color .16s}
article a:hover{border-bottom-color:var(--ink)}
article ul,article ol{margin:0 0 16px;padding-left:22px;color:var(--ink-2)}
article li{margin:0 0 7px}
article li::marker{color:var(--ink-3)}
article hr{border:0;border-top:1px solid var(--line-2);margin:32px 0}
article blockquote{border-left:2px solid var(--ink);padding:2px 0 2px 18px;margin:20px 0;
  color:var(--ink);font-size:17px}
article blockquote p{margin:0 0 8px;color:var(--ink)}
article blockquote p:last-child{margin:0}
article code{font-family:var(--mono);font-size:.9em;background:var(--wash);
  border:1px solid var(--line);border-radius:6px;padding:1px 5px}
article pre{background:#0d0e11;color:#e9eaee;border-radius:14px;padding:16px 18px;
  overflow-x:auto;margin:18px 0;font-size:13px;line-height:1.6}
article pre code{background:none;border:0;padding:0;color:inherit;font-size:inherit}
.tw{overflow-x:auto;border:1px solid var(--line);border-radius:16px;margin:18px 0}
table{border-collapse:collapse;width:100%;font-size:14px;min-width:460px}
th,td{padding:11px 14px;text-align:left;border-bottom:1px solid var(--line-2);vertical-align:top}
th{font-size:12.5px;font-weight:500;color:var(--ink-3);background:var(--wash);white-space:nowrap}
td{color:var(--ink-2)}
td:first-child{color:var(--ink)}
tr:last-child td{border-bottom:0}
aside.toc{position:sticky;top:84px;font-size:13.5px}
aside.toc .t{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin-bottom:10px}
aside.toc a{display:block;color:var(--ink-2);padding:5px 0;border-left:1px solid var(--line);
  padding-left:12px;line-height:1.35}
aside.toc a:hover{color:var(--ink);border-left-color:var(--ink)}
aside.toc a.lvl3{padding-left:24px;font-size:12.5px;color:var(--ink-3)}
.doc-meta{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:26px;
  font-size:13px;color:var(--ink-3)}
.doc-meta .tag{background:var(--wash);border:1px solid var(--line);border-radius:999px;padding:4px 11px}
footer{border-top:1px solid var(--line);padding:26px 0 48px;font-size:13.5px;color:var(--ink-3)}
.foot-in{max-width:1080px;margin:0 auto;padding:0 24px;display:flex;flex-wrap:wrap;
  gap:12px 24px;justify-content:space-between}
.foot-in nav{display:flex;flex-wrap:wrap;gap:6px 16px}
.foot-in a{color:var(--ink-2);border-bottom:1px solid transparent}
.foot-in a:hover{border-bottom-color:var(--ink-3)}
.cards{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-top:26px}
.card{border:1px solid var(--line);border-radius:20px;padding:20px;transition:border-color .18s,transform .18s}
.card:hover{border-color:#d5d5dc;transform:translateY(-1px)}
.card h3{margin:0 0 6px;font-size:17px;font-weight:500;letter-spacing:-.01em}
.card p{margin:0;font-size:14px;color:var(--ink-2);line-height:1.5}
.card .k{font-size:12px;color:var(--ink-3);margin-bottom:8px;letter-spacing:.04em;text-transform:uppercase}
@media print{
  .top,aside.toc,footer{display:none}
  body{font-size:11.5pt}
  article{max-width:none}
  a{border:0}
}
"""

DOC_NAV = [
    ("Лендинг", "index.html"),
    ("Документы", "docs/index.html"),
    ("Презентация", "deck.html"),
    ("Заявка", "join.html"),
]


def page_shell(*, title: str, body: str, toc=None, crumb: str = "", meta: str = "",
               rel_depth: int = 1) -> str:
    """Собирает страницу. rel_depth — глубина файла относительно EX/."""
    base = "../" * (rel_depth - 1)          # docs/X.html → "../", корень EX → ""
    nav = "".join(
        f'<a class="pill{" dark" if i == 0 else ""}" href="{base}{href}">{label}</a>'
        for i, (label, href) in enumerate(DOC_NAV)
    )
    toc_html = ""
    if toc:
        items = []
        for level, anchor, text in toc:
            if level == 1:
                continue
            cls = "lvl3" if level >= 3 else ""
            items.append(f'<a class="{cls}" href="#{anchor}">{html.escape(text)}</a>')
        if items:
            toc_html = ('<aside class="toc"><div class="t">На этой странице</div>'
                        + "".join(items) + "</aside>")
    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html.escape(title)} — EX</title>
<meta name="description" content="EX — эксперимент о том, что делает с человеком количество людей, которых он знает лично.">
<style>{BASE_CSS}</style>
</head>
<body>
<header class="top"><div class="top-in">
  <a class="brand" href="{base}index.html"><i></i>EX</a>
  <span class="crumb">{html.escape(crumb)}</span>
  <span class="sp"></span>
  {nav}
</div></header>
<div class="wrap"><div class="layout">
  <article>
    {meta}
    {body}
  </article>
  {toc_html}
</div></div>
<footer><div class="foot-in">
  <span>EX · ONEDOPEA · 2026 · протокол v1</span>
  <nav>
    <a href="{base}index.html">Лендинг</a>
    <a href="{base}docs/index.html">Документы</a>
    <a href="{base}docs/PITCH.html">Питч</a>
    <a href="{base}join.html">Записаться</a>
  </nav>
</div></footer>
</body>
</html>
"""


# ─────────────────────────────────────────────────────────────
# Сборка
# ─────────────────────────────────────────────────────────────

INTRO_EXCERPT = 190


def _excerpt(md: str) -> str:
    for line in md.split("\n"):
        s = line.strip()
        if s and not s.startswith(("#", "|", ">", "-", "*", "```", "!", "[")):
            return _plain(s)[:INTRO_EXCERPT].rstrip() + ("…" if len(_plain(s)) > INTRO_EXCERPT else "")
    return ""


def _title(md: str, fallback: str) -> str:
    """Заголовок документа без служебного префикса «EX //»."""
    for line in md.split("\n"):
        if line.startswith("# "):
            t = _plain(line[2:])
            t = re.sub(r"^EX\s*(//|—|–|-)?\s*", "", t).strip()
            return t or fallback
    return fallback


# порядок карточек в каталоге документов: сначала то, с чего начинают
DOC_ORDER = [
    "PITCH", "LAUNCH", "PLAN-SIMPLE", "START-ZERO", "PROTOCOL", "ETHICS",
    "MONEY", "ROLES", "CONTENT", "MATH", "PLAN", "PRESS", "GLOSSARY",
]


def _doc_rank(stem: str) -> int:
    return DOC_ORDER.index(stem) if stem in DOC_ORDER else len(DOC_ORDER)


def build(check_only=False):
    targets = []
    for folder in ("docs", "templates", "ledger"):
        d = EX / folder
        if not d.exists():
            continue
        for p in sorted(d.glob("*.md")):
            targets.append(p)

    built = 0
    for src in targets:
        md = src.read_text(encoding="utf-8")
        title = _title(md, src.stem)
        body, toc = md_to_html(md)
        depth = len(src.relative_to(EX).parts)          # docs/X.md → 2
        crumb = "EX / " + " / ".join(src.relative_to(EX).parts[:-1])
        meta = (f'<div class="doc-meta"><span class="tag">{src.relative_to(ROOT)}</span>'
                f'<a href="{src.name}" download>скачать .md</a></div>')
        out_html = page_shell(title=title, body=body, toc=toc, crumb=crumb,
                              meta=meta, rel_depth=depth)
        if not check_only:
            src.with_suffix(".html").write_text(out_html, encoding="utf-8")
        built += 1

    # каталог документов
    if not check_only:
        cards = []
        docs = sorted((t for t in targets if t.parent.name == "docs"),
                      key=lambda t: (_doc_rank(t.stem), t.stem))
        for src in docs:
            md = src.read_text(encoding="utf-8")
            cards.append(
                f'<a class="card" href="{src.stem}.html">'
                f'<div class="k">{src.stem}.md</div>'
                f'<h3>{html.escape(_title(md, src.stem))}</h3>'
                f'<p>{html.escape(_excerpt(md))}</p></a>'
            )
        cards.append(
            '<a class="card" href="../deck.html"><div class="k">deck</div>'
            '<h3>Презентация</h3><p>Двенадцать слайдов для разговора с партнёром, '
            'фондом или площадкой.</p></a>'
        )
        cards.append(
            '<a class="card" href="../join.html"><div class="k">join</div>'
            '<h3>Заявка на вечер</h3><p>Страница для участников: правила, что взять, '
            'форма записи.</p></a>'
        )
        body = ('<h1 id="top">Документы EX</h1>'
                '<p>Всё, что описывает проект: от научного протокола до чек-листа '
                'одного вечера. Каждый файл можно читать на сайте или скачать '
                'в исходном markdown.</p>'
                f'<div class="cards">{"".join(cards)}</div>')
        out = page_shell(title="Документы", body=body, crumb="EX / документы", rel_depth=2)
        (EX / "docs" / "index.html").write_text(out, encoding="utf-8")

    return built


def main():
    check_only = "--check" in sys.argv
    n = build(check_only)
    print(f"{'проверено' if check_only else 'собрано'} страниц: {n}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
