/* Общая обвязка сайта: верхнее меню, «Поделиться расчётом», печать, офлайн-режим. */
(function () {
  "use strict";
  var PAGES = [
    ["Точность", [["posadki.html", "Посадки и допуски"], ["razmernye-cepi.html", "Размерные цепи"], ["sherokhovatost.html", "Шероховатость"]]],
    ["Обработка", [["rezhimy-rezaniya.html", "Режимы резания"], ["rezby.html", "Резьбы"], ["konusy.html", "Конусы"]]],
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
        '<details class="sb-menu"><summary>' + ICON.menu + '<span class="sb-lbl">Калькуляторы</span></summary><div class="sb-drop">' + menuHTML + '<a class="sb-all" href="./">Все калькуляторы на главной →</a></div></details>' +
        (stateKey ? '<button type="button" class="sb-btn" id="sbShare" title="Скопировать ссылку на этот расчёт">' + ICON.share + '<span class="sb-lbl">Поделиться</span></button>' : "") +
        (!isHub ? '<button type="button" class="sb-btn" id="sbPrint" title="Распечатать или сохранить в PDF">' + ICON.print + '<span class="sb-lbl">Печать</span></button>' : "") +
      "</div>" +
    "</div>");
  document.body.insertBefore(bar, document.body.firstChild);
  var det = bar.querySelector(".sb-menu");
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
