"""Сборка страниц из src/parts в корень репозитория, затем вставка общей обвязки.
Запуск из корня репозитория: python3 src/build.py gibka:gibka-lista.html ...
Без аргументов собирает все страницы из таблицы PARTS.
Страницы posadki.html, razmernye-cepi.html, rezhimy-rezaniya.html и index.html правятся прямо в корне."""
import sys, subprocess
PARTS = {"rezby": "rezby.html", "massa": "massa-metalla.html", "sherokh": "sherokhovatost.html", "analogi": "analogi-staley.html",
         "gibka": "gibka-lista.html", "svarka": "rashod-elektrodov.html", "konusy": "konusy.html",
         "raskroy": "raskroy-lista.html", "sebestoimost": "sebestoimost.html", "dyuymy": "dyuymy.html"}
base = open("src/base.css", encoding="utf-8").read()
HEAD = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">')
PAGES = [("posadki.html", "Посадки и допуски"), ("razmernye-cepi.html", "Размерные цепи"), ("sherokhovatost.html", "Шероховатость"),
         ("rezhimy-rezaniya.html", "Режимы резания"), ("rezby.html", "Резьбы"), ("konusy.html", "Конусы"), ("gibka-lista.html", "Гибка листа"),
         ("raskroy-lista.html", "Раскрой листа"), ("rashod-elektrodov.html", "Расход на сварку"), ("massa-metalla.html", "Масса металла"),
         ("analogi-staley.html", "Аналоги сталей"), ("dyuymy.html", "Дюймы и UNC"), ("sebestoimost.html", "Себестоимость")]
def menu(cur): return '<a href="index.html"><b>Все калькуляторы</b></a> ' + " ".join(f'<a href="{f}">{n}</a>' for f, n in PAGES if f != cur)
jobs = [a.split(":") for a in sys.argv[1:]] or list(PARTS.items())
for part, out in jobs:
    s = open(f"src/parts/{part}.html", encoding="utf-8").read()
    s = s.replace("/*BASE*/", base).replace("<!--HEAD-->", HEAD).replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "")
    s = s.replace("<!--NAV-->", '<a href="index.html">Основы металлообработки</a> · калькулятор').replace("<!--MENU-->", menu(out))
    i = s.find('<div class="wrap">')
    doc = ('<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
           '<style>[hidden]{display:none!important}img{max-width:100%}</style>\n<!-- Яндекс.Метрика: вставьте сюда код счётчика -->\n'
           + s[:i] + '</head>\n<body>\n' + s[i:] + '\n</body>\n</html>\n')
    open(out, "w", encoding="utf-8").write(doc); print("built", out)
subprocess.run([sys.executable, "src/inject.py"], check=True)
