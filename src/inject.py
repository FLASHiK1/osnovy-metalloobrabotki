"""Вставляет общую обвязку сайта (меню, «Поделиться», печать, офлайн, превью ссылок) во все страницы.
Запуск из корня репозитория: python3 src/inject.py. Повторный запуск безопасен."""
import re, glob, html
SITE = "https://flashik1.github.io/osnovy-metalloobrabotki/"
KEYS = {"posadki.html": "posadki-v1", "razmernye-cepi.html": "razm-cepi-v1", "rezhimy-rezaniya.html": "rezhimy-v1",
        "rezby.html": "rezby-v1", "massa-metalla.html": "massa-v1", "sherokhovatost.html": "sherokh-v1",
        "gibka-lista.html": "gibka-v1", "rashod-elektrodov.html": "svarka-v1", "konusy.html": "konusy-v1",
        "raskroy-lista.html": "raskroy-v1", "sebestoimost.html": "sebest-v1", "dyuymy.html": "dyuymy-v1",
        "zatyazhka.html": "zatyazhka-v1", "shesterni.html": "shesterni-v1", "natyag.html": "natyag-v1", "gkody.html": "gkody-v1",
        "plastiny.html": "plastiny-v1", "vybor-instrumenta.html": "vybor-v1",
        "marki-staley.html": "marki-v1", "podshipniki.html": "podsh-v1", "dopuski-formy.html": "dopforma-v1", "cveta-pobezhalosti.html": "cveta-v1",
        "rezba-rezcom.html": "rezcom-v1", "edinicy.html": "edinicy-v1"}
METRIKA_HEAD = """<!-- Yandex.Metrika counter -->
<script type="text/javascript">
    (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=113975628', 'ym');

    ym(113975628, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
</script>
<!-- /Yandex.Metrika counter -->"""
METRIKA_BODY = '<noscript><div><img src="https://mc.yandex.ru/watch/113975628" style="position:absolute; left:-9999px;" alt="" /></div></noscript>'
INDEX = []
for f in sorted(glob.glob("*.html")):
    if f.startswith(("yandex_", "google")): continue  # файлы подтверждения прав — не трогать
    s = open(f, encoding="utf-8").read()
    s = re.sub(r"\n?<!--site:head-->.*?<!--/site:head-->", "", s, flags=re.S)
    s = re.sub(r"\n?<!--site:body-->.*?<!--/site:body-->", "", s, flags=re.S)
    title = re.search(r"<title>(.*?)</title>", s, re.S).group(1).strip()
    m = re.search(r'<meta name="description" content="(.*?)">', s, re.S)
    desc = m.group(1) if m else title
    url = SITE + ("" if f == "index.html" else f)
    ogt = title if f == "index.html" else f"{title} — Основы металлообработки"
    s = s.replace('<!-- Яндекс.Метрика: вставьте сюда код счётчика -->\n', '')
    head = ['<!--site:head-->',
            '<meta name="yandex-verification" content="68bc83a227a58ef7">',
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
    head.append(METRIKA_HEAD)
    head.append('<!--/site:head-->')
    s = re.sub(r'(<meta name="viewport"[^>]*>)', lambda mm: mm.group(1) + "\n" + "\n".join(head), s, count=1)
    s = s.replace("</body>", '<!--site:body-->' + METRIKA_BODY + '<script src="assets/site.js" defer></script><!--/site:body-->\n</body>', 1)
    open(f, "w", encoding="utf-8").write(s)
    heads = [re.sub(r"<[^>]+>", "", h).strip() for h in re.findall(r"<h[23][^>]*>(.*?)</h[23]>", s, re.S)]
    INDEX.append({"u": "./" if f == "index.html" else f, "t": html.unescape(title), "d": html.unescape(desc), "h": [html.unescape(h) for h in heads if h][:20],
                  "k": "статья" if f.startswith("stati-") else ("главная" if f == "index.html" else "калькулятор")})
    print("ok", f)
import json
open("assets/search.json", "w", encoding="utf-8").write(json.dumps(INDEX, ensure_ascii=False))
print("search index:", len(INDEX))
