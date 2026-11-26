"""Собирает автономный docs/dope-feed-concept.html из docs/src-feed/*.

    python3 docs/src-feed/build.py          # сухой прогон: печатает размер
    python3 docs/src-feed/build.py write    # записывает файл

Порядок частей:
    head.html · <script>three.min.js</script> · <style>base-style.css + feed.css</style>
    </head> · body.html · <script>dope-app.js с вклеенным /*__FEED_BUNDLE__*/</script>

Бандл = feed-posts.js + feed-rig.js + feed-cats.js + hero-cat.js + feed-bridge.js.
SVG-ассеты проектов из public/assets/ подставляются как data: URL, поэтому
итоговый HTML остаётся автономным (Three.js тоже внутри).
"""
import pathlib, re, sys, urllib.parse

S = pathlib.Path(__file__).resolve().parent
ROOT = S.parent.parent
OUT = ROOT / 'docs' / 'dope-feed-concept.html'
BUNDLE = '/*__FEED_BUNDLE__*/'


def read(name):
    return (S / name).read_text(encoding='utf-8')


def inline_assets(code):
    def repl(m):
        path = ROOT / 'public' / m.group(1)
        data = urllib.parse.quote(path.read_text(encoding='utf-8'), safe='(),:/=; ')
        return "'data:image/svg+xml," + data + "'"
    return re.sub(r"'(assets/[^']+\.svg)'", repl, code)


def build():
    three = (ROOT / 'three.min.js').read_text(encoding='utf-8')
    bundle = (inline_assets(read('feed-posts.js')) + '\n'
              + read('feed-rig.js') + '\n'
              + read('feed-cats.js') + '\n'
              + read('hero-cat.js') + '\n'
              + read('feed-bridge.js'))
    app = read('dope-app.js').replace(BUNDLE + '\n', bundle)
    assert BUNDLE not in app, 'в dope-app.js должен остаться ровно один маркер бандла'
    return ''.join([
        read('head.html'),
        '<script>\n', three, '\n    </script>\n\n    <style>',
        read('base-style.css'), read('feed.css'), '\n    ',
        '</style>\n\n\n</head>\n',
        read('body.html'),
        '<script>', app, '</script>\n</body>\n</html>\n',
    ])


if __name__ == '__main__':
    html = build()
    if 'write' in sys.argv:
        OUT.write_text(html, encoding='utf-8')
    print('assembled', len(html), '→', OUT.relative_to(ROOT), '(записан)' if 'write' in sys.argv else '(сухой прогон)')
