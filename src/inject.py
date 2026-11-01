"""Вставляет общую обвязку сайта (меню, «Поделиться», печать, офлайн, превью ссылок) во все страницы.
Запуск из корня репозитория: python3 src/inject.py. Повторный запуск безопасен."""
import re, glob, html
SITE = "https://flashik1.github.io/osnovy-metalloobrabotki/"
KEYS = {"posadki.html": "posadki-v1", "razmernye-cepi.html": "razm-cepi-v1", "rezhimy-rezaniya.html": "rezhimy-v1",
        "rezby.html": "rezby-v1", "massa-metalla.html": "massa-v1", "sherokhovatost.html": "sherokh-v1",
        "gibka-lista.html": "gibka-v1", "rashod-elektrodov.html": "svarka-v1", "konusy.html": "konusy-v1"}
for f in sorted(glob.glob("*.html")):
    s = open(f, encoding="utf-8").read()
    s = re.sub(r"\n?<!--site:head-->.*?<!--/site:head-->", "", s, flags=re.S)
    s = re.sub(r"\n?<!--site:body-->.*?<!--/site:body-->", "", s, flags=re.S)
    title = re.search(r"<title>(.*?)</title>", s, re.S).group(1).strip()
    m = re.search(r'<meta name="description" content="(.*?)">', s, re.S)
    desc = m.group(1) if m else title
    url = SITE + ("" if f == "index.html" else f)
    ogt = title if f == "index.html" else f"{title} — Основы металлообработки"
    head = ['<!--site:head-->',
            f'<link rel="canonical" href="{url}">',
            '<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">',
            '<link rel="icon" href="assets/favicon-48.png" sizes="48x48" type="image/png">',
            '<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">',
            '<link rel="manifest" href="manifest.webmanifest">',
            '<meta name="theme-color" content="#1d5a7a">',
            '<meta property="og:type" content="website">',
            '<meta property="og:locale" content="ru_RU">',
            '<meta property="og:site_name" content="Основы металлообработки">',
            f'<meta property="og:title" content="{html.escape(ogt, quote=True)}">',
            f'<meta property="og:description" content="{desc}">',
            f'<meta property="og:url" content="{url}">',
            f'<meta property="og:image" content="{SITE}assets/og.png">',
            '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">',
            '<meta name="twitter:card" content="summary_large_image">',
            '<link rel="stylesheet" href="assets/site.css">']
    if f in KEYS:
        head.append(f'<meta name="state-key" content="{KEYS[f]}">')
        head.append('<script src="assets/early.js"></script>')
    head.append('<!--/site:head-->')
    s = re.sub(r'(<meta name="viewport"[^>]*>)', lambda mm: mm.group(1) + "\n" + "\n".join(head), s, count=1)
    s = s.replace("</body>", '<!--site:body--><script src="assets/site.js" defer></script><!--/site:body-->\n</body>', 1)
    open(f, "w", encoding="utf-8").write(s)
    print("ok", f)
