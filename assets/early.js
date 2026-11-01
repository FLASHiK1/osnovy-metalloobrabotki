/* Выполняется в <head> до скрипта калькулятора.
   ?s=…  — присланный расчёт целиком: заменяет сохранённое состояние калькулятора.
   ?m=…  — переход из другого калькулятора: подставляет отдельные значения поверх сохранённого,
           не трогая остальное (например, настройки станка).
   window.siteLink(page, values) — собирает ссылку для перехода с подстановкой. */
(function () {
  var KEYS = {
    "posadki.html": "posadki-v1", "razmernye-cepi.html": "razm-cepi-v1", "rezhimy-rezaniya.html": "rezhimy-v1",
    "rezby.html": "rezby-v1", "massa-metalla.html": "massa-v1", "sherokhovatost.html": "sherokh-v1",
    "gibka-lista.html": "gibka-v1", "rashod-elektrodov.html": "svarka-v1", "konusy.html": "konusy-v1",
    "raskroy-lista.html": "raskroy-v1", "sebestoimost.html": "sebest-v1", "dyuymy.html": "dyuymy-v1",
    "zatyazhka.html": "zatyazhka-v1", "shesterni.html": "shesterni-v1", "natyag.html": "natyag-v1", "gkody.html": "gkody-v1",
    "plastiny.html": "plastiny-v1", "vybor-instrumenta.html": "vybor-v1"
  };
  function enc(obj) {
    var bytes = new TextEncoder().encode(JSON.stringify(obj)), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function dec(s) {
    var b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function merge(a, b) {
    if (!b || typeof b !== "object" || Array.isArray(b)) return b;
    var out = (a && typeof a === "object" && !Array.isArray(a)) ? a : {};
    for (var k in b) out[k] = merge(out[k], b[k]);
    return out;
  }
  window.siteLink = function (page, values) { return page + "?m=" + enc(values); };
  try {
    var m = document.querySelector('meta[name="state-key"]');
    var key = m && m.content;
    var p = new URLSearchParams(location.search);
    var s = p.get("s"), mm = p.get("m");
    if (!key || (!s && !mm)) return;
    if (s) {
      var json = dec(s); JSON.parse(json);
      localStorage.setItem(key, json);
      window.__sharedState = "share";
    } else {
      var add = JSON.parse(dec(mm)), cur = null;
      try { cur = JSON.parse(localStorage.getItem(key) || "null"); } catch (e) {}
      localStorage.setItem(key, JSON.stringify(merge(cur, add)));
      window.__sharedState = "link";
    }
    p.delete("s"); p.delete("m");
    var q = p.toString();
    history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
  } catch (e) { /* битая ссылка или недоступное хранилище — открываем как обычно */ }
})();
