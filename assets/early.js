/* Выполняется в <head> до скрипта калькулятора: если в адресе есть ?s=…, кладёт
   присланный расчёт в localStorage, чтобы калькулятор открылся именно с ним. */
(function () {
  try {
    var m = document.querySelector('meta[name="state-key"]');
    var key = m && m.content;
    var p = new URLSearchParams(location.search);
    var s = p.get("s");
    if (!key || !s) return;
    var b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var json = new TextDecoder().decode(bytes);
    JSON.parse(json); // проверка, что это корректный расчёт
    localStorage.setItem(key, json);
    window.__sharedState = true;
    p.delete("s");
    var q = p.toString();
    history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
  } catch (e) { /* битая ссылка или недоступное хранилище — открываем как обычно */ }
})();
