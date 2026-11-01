/* Общие помощники для простых калькуляторов: чтение чисел, форматирование, сохранение состояния, вывод результатов. */
(function () {
  "use strict";
  var C = window.Calc = {};
  C.$ = function (id) { return document.getElementById(id); };
  // число из поля: запятая или точка, пробелы игнорируются; пусто или мусор — NaN
  C.num = function (s) {
    var t = String(s == null ? "" : s).trim().replace(/,/g, ".").replace(/\s+/g, "");
    if (!t) return NaN;
    return /^-?\d*\.?\d+(e-?\d+)?$/i.test(t) ? +t : NaN;
  };
  // фиксированное число знаков, пробел между разрядами, запятая
  C.fmt = function (v, d) {
    if (!isFinite(v)) return "—";
    var s = (+v).toFixed(d == null ? 2 : d), p = s.split(".");
    var a = p[0].replace("-", "−").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return p[1] ? a + "," + p[1] : a;
  };
  // разумная точность: 3–4 значащие цифры
  C.sig = function (v) {
    if (!isFinite(v)) return "—";
    var a = Math.abs(v);
    return C.fmt(v, a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 2 : a >= 1 ? 2 : a >= 0.1 ? 3 : 4);
  };
  C.esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  C.kpis = function (el, arr) {
    el.innerHTML = arr.map(function (k) {
      return '<div class="kpi' + (k[3] ? " " + k[3] : "") + '"><span class="l">' + k[0] + '</span><span class="v">' + k[1] + (k[2] ? "<small>" + k[2] + "</small>" : "") + "</span></div>";
    }).join("");
  };
  C.kv = function (el, arr) {
    el.innerHTML = arr.map(function (r) { return r === "-" ? '<div class="sep"></div>' : "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>"; }).join("");
  };
  // итог проверки: ok — зелёная плашка, иначе красная
  C.verdict = function (el, ok, text) {
    el.className = "verdict " + (ok ? "ok" : "no");
    el.innerHTML = '<b>' + (ok ? "Проходит" : "Не проходит") + "</b> " + text;
    el.hidden = false;
  };
  // привязка полей к состоянию: значения из localStorage, сохранение при каждом изменении
  C.bind = function (key, st, ids, calc) {
    try { var x = JSON.parse(localStorage.getItem(key) || "null"); if (x && typeof x === "object") for (var k in x) if (k in st) st[k] = x[k]; } catch (e) {}
    function run() { try { localStorage.setItem(key, JSON.stringify(st)); } catch (e) {} calc(); }
    ids.forEach(function (id) {
      var el = C.$(id); if (!el) return;
      if (el.type === "checkbox") {
        el.checked = !!st[id];
        el.addEventListener("change", function () { st[id] = el.checked; run(); });
      } else {
        el.value = st[id];
        if (el.tagName === "SELECT" && el.value !== String(st[id])) st[id] = el.value;
        el.addEventListener(el.tagName === "SELECT" ? "change" : "input", function () { st[id] = el.value; run(); });
      }
    });
    return function (patch) { for (var k in patch) { st[k] = patch[k]; var el = C.$(k); if (el) { if (el.type === "checkbox") el.checked = !!st[k]; else el.value = st[k]; } } run(); };
  };
  // проверка полей: возвращает значения, подсвечивает неверные
  C.read = function (st, spec) {
    var out = {}, ok = true;
    for (var id in spec) {
      var v = C.num(st[id]), r = spec[id], good = isFinite(v) && v >= r[0] && v <= r[1];
      var el = C.$(id); if (el) el.classList.toggle("bad", !good);
      if (!good) ok = false;
      out[id] = v;
    }
    out.ok = ok;
    return out;
  };
  // сегментные кнопки [data-k="значение"] внутри контейнера id
  C.seg = function (id, get, set) {
    var box = C.$(id);
    function paint() { box.querySelectorAll("[data-k]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.k === get())); b.classList.toggle("on", b.dataset.k === get()); }); }
    box.addEventListener("click", function (e) { var b = e.target.closest("[data-k]"); if (!b) return; set(b.dataset.k); paint(); });
    paint();
    return paint;
  };
  C.near = function (list, v, up) {
    for (var i = 0; i < list.length; i++) if (up ? list[i] >= v - 1e-9 : list[i] > v) return up ? list[i] : list[i - 1];
    return up ? NaN : list[list.length - 1];
  };
  // нормальные линейные размеры, ГОСТ 6636 (ряд Ra40)
  C.RA40 = [1, 1.05, 1.1, 1.15, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 2.1, 2.2, 2.4, 2.5, 2.6, 2.8, 3, 3.2, 3.4, 3.6, 3.8, 4, 4.2, 4.5, 4.8, 5, 5.3, 5.6, 6, 6.3, 6.7, 7.1, 7.5, 8, 8.5, 9, 9.5]
    .reduce(function (a, x) { return a.concat([x, x * 10, x * 100]); }, []).concat([1000]).map(function (x) { return Math.round(x * 100) / 100; }).sort(function (a, b) { return a - b; });
})();
