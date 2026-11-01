/* Общая обвязка сайта: верхнее меню, «Поделиться расчётом», печать, офлайн-режим. */
(function () {
  "use strict";
  var PAGES = [
    ["Точность", [["posadki.html", "Посадки и допуски"], ["razmernye-cepi.html", "Размерные цепи"], ["sherokhovatost.html", "Шероховатость"]]],
    ["Обработка", [["rezhimy-rezaniya.html", "Режимы резания"], ["rezby.html", "Резьбы"], ["konusy.html", "Конусы"]]],
    ["Справочник", [["vybor-instrumenta.html", "Выбор режущего инструмента"], ["plastiny.html", "Пластины и державки"], ["gkody.html", "G-коды и M-коды"], ["marki-staley.html", "Расшифровка марки стали"], ["podshipniki.html", "Подшипники"], ["dopuski-formy.html", "Допуски формы и расположения"], ["cveta-pobezhalosti.html", "Цвета побежалости"]]],
    ["Конструирование", [["zatyazhka.html", "Момент затяжки болтов"], ["shesterni.html", "Зубчатые колёса"], ["natyag.html", "Сборка с натягом"]]],
    ["Лист и сварка", [["gibka-lista.html", "Гибка листа"], ["raskroy-lista.html", "Раскрой листа"], ["rashod-elektrodov.html", "Расход на сварку"]]],
    ["Материалы", [["massa-metalla.html", "Масса металла"], ["analogi-staley.html", "Аналоги сталей"]]],
    ["Пересчёт и экономика", [["dyuymy.html", "Дюймы и UNC"], ["sebestoimost.html", "Себестоимость детали"]]]
  ];
  var here = (location.pathname.split("/").pop() || "index.html");
  var keyMeta = document.querySelector('meta[name="state-key"]');
  var stateKey = keyMeta ? keyMeta.content : null;
  var isHub = here === "index.html" || here === "";

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  var ICON = {
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="18" cy="5" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="19" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    print: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V3h10v6M7 18H4v-7h16v7h-3M7 14h10v7H7z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/></svg>'
  };

  /* ---------- 1. Верхнее меню ---------- */
  var menuHTML = PAGES.map(function (g) {
    return '<div class="sb-grp"><div class="sb-gt">' + g[0] + "</div>" + g[1].map(function (p) {
      return '<a href="' + p[0] + '"' + (p[0] === here ? ' aria-current="page"' : "") + ">" + p[1] + "</a>";
    }).join("") + "</div>";
  }).join("");
  var bar = el("div", { "class": "sitebar", role: "navigation", "aria-label": "Навигация по сайту" },
    '<div class="sb-in">' +
      '<a class="sb-brand" href="./"><img src="assets/favicon.svg" alt="" width="22" height="22"><span>Основы металлообработки</span></a>' +
      '<div class="sb-act">' +
        '<details class="sb-menu"><summary>' + ICON.menu + '<span class="sb-lbl">Калькуляторы</span></summary><div class="sb-drop"><input type="search" class="sb-q" placeholder="Поиск по сайту: посадка, M10, 40Х…" aria-label="Поиск по сайту"><div class="sb-res" hidden></div>' + menuHTML + '<a class="sb-all" href="./#stati">Статьи и объяснения →</a><a class="sb-all" href="./">Все калькуляторы на главной →</a></div></details>' +
        (stateKey ? '<button type="button" class="sb-btn" id="sbShare" title="Скопировать ссылку на этот расчёт">' + ICON.share + '<span class="sb-lbl">Поделиться</span></button>' : "") +
        (!isHub ? '<button type="button" class="sb-btn" id="sbPrint" title="Распечатать или сохранить в PDF">' + ICON.print + '<span class="sb-lbl">Печать</span></button>' : "") +
      "</div>" +
    "</div>");
  document.body.insertBefore(bar, document.body.firstChild);
  var det = bar.querySelector(".sb-menu");
  /* ---------- Поиск ---------- */
  var IDX = null;
  function loadIdx() { if (IDX) return Promise.resolve(IDX); return fetch("assets/search.json").then(function (r) { return r.json(); }).then(function (j) { IDX = j; return j; }); }
  function norm(s) { return String(s).toLowerCase().replace(/ё/g, "е").replace(/[aceopxyhtkmb]/g, function (c) { return { a: "а", c: "с", e: "е", o: "о", p: "р", x: "х", y: "у", h: "н", t: "т", k: "к", m: "м", b: "в" }[c]; }); }
  window.siteSearch = function (q) {
    return loadIdx().then(function (idx) {
      var words = norm(q).split(/[\s,]+/).filter(function (w) { return w.length > 1 || /\d/.test(w); });
      if (!words.length) return [];
      return idx.map(function (p) {
        var t = norm(p.t), d = norm(p.d), h = norm(p.h.join(" ")), sc = 0, all = true;
        words.forEach(function (w) { var s1 = t.indexOf(w) >= 0 ? 5 : 0, s2 = h.indexOf(w) >= 0 ? 2 : 0, s3 = d.indexOf(w) >= 0 ? 1 : 0; if (!s1 && !s2 && !s3) all = false; sc += s1 + s2 + s3; });
        return { p: p, sc: all ? sc + (p.k === "калькулятор" ? 0.5 : 0) : 0 };
      }).filter(function (r) { return r.sc > 0; }).sort(function (a, b) { return b.sc - a.sc; }).slice(0, 8).map(function (r) { return r.p; });
    });
  };
  var qIn = bar.querySelector(".sb-q"), qRes = bar.querySelector(".sb-res");
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function renderRes(list, q) {
    var groupsEls = bar.querySelectorAll(".sb-grp, .sb-all");
    var on = !!q.trim();
    groupsEls.forEach(function (g) { g.hidden = on; });
    qRes.hidden = !on;
    if (!on) return;
    qRes.innerHTML = list.length ? list.map(function (p) { return '<a href="' + p.u + '"><b>' + esc(p.t) + '</b><span>' + esc(p.k) + " · " + esc(p.d.slice(0, 90)) + "…</span></a>"; }).join("") : '<div class="sb-none">Ничего не нашлось. Попробуйте другое слово: «резьба», «посадка», «сталь».</div>';
  }
  qIn.addEventListener("input", function () { var q = qIn.value; window.siteSearch(q).then(function (l) { if (qIn.value === q) renderRes(l, q); }).catch(function () {}); });
  qIn.addEventListener("keydown", function (e) { if (e.key === "Enter") { var a = qRes.querySelector("a"); if (a) location.href = a.getAttribute("href"); } });
  document.addEventListener("keydown", function (e) { if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "")) { e.preventDefault(); det.open = true; setTimeout(function () { qIn.focus(); }, 0); } });
  det.addEventListener("toggle", function () { if (det.open && matchMedia("(pointer: fine)").matches) setTimeout(function () { qIn.focus(); }, 0); });
  document.addEventListener("click", function (e) { if (det.open && !det.contains(e.target)) det.open = false; });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && det.open) { det.open = false; det.querySelector("summary").focus(); } });

  /* всплывающее сообщение (своё, чтобы не зависеть от страницы) */
  var tipEl = el("div", { "class": "sb-toast", role: "status", "aria-live": "polite" });
  document.body.appendChild(tipEl);
  var tipT = null;
  function tip(t) { tipEl.textContent = t; tipEl.classList.add("show"); clearTimeout(tipT); tipT = setTimeout(function () { tipEl.classList.remove("show"); }, 2600); }
  if (window.__sharedState) setTimeout(function () { tip(window.__sharedState === "link" ? "Значения подставлены из соседнего калькулятора" : "Открыт расчёт по присланной ссылке"); }, 400);

  /* ---------- 2. Поделиться расчётом ---------- */
  function shareURL() {
    var base = location.origin + location.pathname;
    if (!stateKey) return base;
    var json = null;
    try { json = localStorage.getItem(stateKey); } catch (e) {}
    if (!json) return base;
    var bytes = new TextEncoder().encode(json), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    var b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return base + "?s=" + b64;
  }
  var shareBtn = document.getElementById("sbShare");
  if (shareBtn) shareBtn.addEventListener("click", function () {
    var url = shareURL(), title = document.title;
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      navigator.share({ title: title, text: title + " — расчёт", url: url }).catch(function () {});
      return;
    }
    function fallback() {
      var ta = el("textarea", { readonly: "", "class": "sb-copy" }); ta.value = url; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      tip(ok ? "Ссылка на расчёт скопирована" : "Не удалось скопировать — скопируйте адрес вручную");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { tip("Ссылка на расчёт скопирована — отправьте её коллеге"); }, fallback);
    else fallback();
  });

  /* ---------- 3. Печать ---------- */
  var ph = el("div", { "class": "print-head" });
  document.body.insertBefore(ph, bar.nextSibling);
  function fillPrintHead() {
    var d = new Date();
    var ds = d.toLocaleDateString("ru-RU") + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    ph.innerHTML = "<b>Основы металлообработки</b> · " + document.title + " · " + ds +
      '<div class="ph-url">' + shareURL() + "</div>";
  }
  window.addEventListener("beforeprint", function () { fillPrintHead(); document.querySelectorAll("details.theory").forEach(function (d) { d.dataset.wasOpen = d.open ? "1" : ""; }); });
  var pb = document.getElementById("sbPrint");
  if (pb) pb.addEventListener("click", function () { fillPrintHead(); window.print(); });

  /* ---------- 4. Офлайн-режим ---------- */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
})();
