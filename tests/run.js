/* Автотесты сайта: контрольные примеры для каждого калькулятора, «Поделиться», переходы, ошибки в консоли.
   Запуск из корня репозитория:  node tests/run.js
   Нужны Node.js и Playwright с Chromium (npm i -D playwright && npx playwright install chromium). */
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = 8790 + Math.floor(Math.random() * 100);
const BASE = `http://localhost:${PORT}/`;
const norm = s => String(s).replace(/\s+/g, " ").trim();

let passed = 0, failed = 0;
function check(name, ok, info) {
  if (ok) { passed++; console.log("  ✓ " + name); }
  else { failed++; console.log("  ✗ " + name + (info ? "  →  " + info : "")); }
}
async function text(p, sel) { return norm(await p.textContent(sel)); }

const PAGES = ["index.html", "posadki.html", "razmernye-cepi.html", "sherokhovatost.html", "rezhimy-rezaniya.html", "rezby.html",
  "konusy.html", "gibka-lista.html", "raskroy-lista.html", "rashod-elektrodov.html", "massa-metalla.html", "analogi-staley.html",
  "dyuymy.html", "sebestoimost.html", "zatyazhka.html", "shesterni.html", "natyag.html", "gkody.html",
  "stati-posadka-h7-g6.html", "stati-rezba-6g-6h.html", "stati-sherokhovatost-ra-rz.html", "stati-razvertka-gibka-k-faktor.html", "stati-rezhimy-rezaniya-raschet.html", "stati-sverlo-pod-rezbu.html"];

(async () => {
  const srv = spawn("python3", ["-m", "http.server", String(PORT)], { cwd: ROOT, stdio: "ignore" });
  await new Promise(r => setTimeout(r, 800));
  const browser = await chromium.launch();
  // каждый тест — в чистом контексте, без сохранённых расчётов
  async function page(file, opts = {}) {
    const ctx = await browser.newContext({ viewport: { width: opts.w || 1200, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
    const p = await ctx.newPage();
    p.errors = [];
    p.on("pageerror", e => p.errors.push(e.message));
    p.on("console", m => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) p.errors.push(m.text()); });
    await p.goto(BASE + file);
    await p.waitForTimeout(350);
    return p;
  }
  const done = async p => { await p.context().close(); };
  const settle = p => p.waitForTimeout(220);

  try {
    console.log("Все страницы: загрузка, меню, без ошибок, без горизонтальной прокрутки на телефоне");
    for (const f of PAGES) {
      const p = await page(f, { w: 390 });
      const bar = await p.$$eval(".sitebar", x => x.length);
      const wide = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      check(f, bar === 1 && !wide && p.errors.length === 0, `меню ${bar}, прокрутка ${wide}, ошибки ${p.errors.join("; ")}`);
      await done(p);
    }

    console.log("Посадки");
    { const p = await page("posadki.html");
      await p.fill("#nom", "25"); await p.fill("#hole", "H7"); await p.fill("#shaft", "g6"); await settle(p);
      let t = await text(p, "#cFit"); check("Ø25 H7/g6: Smax 0,041, Smin 0,007", t.includes("0,041") && t.includes("0,007"), t);
      check("H7/g6: рекомендуемая Ra отверстия 0,8, вала 0,4", t.includes("Ra ≤ 0,8") && t.includes("Ra ≤ 0,4"), t);
      await p.fill("#nom", "60"); await p.fill("#shaft", "s6"); await settle(p);
      t = await text(p, "#cFit"); check("Ø60 H7/s6: Nmax 0,072, Nmin 0,023", t.includes("0,072") && t.includes("0,023"), t);
      await p.fill("#nom", "25"); await p.fill("#hole", "K7"); await p.fill("#shaft", "h6"); await settle(p);
      t = await text(p, "#cHole"); check("K7 Ø25: ES +0,006, EI −0,015", t.includes("+0,006") && t.includes("−0,015"), t);
      await p.selectOption("#std", "ost"); await settle(p);
      t = await text(p, "#chips"); check("ОСТ А/Х → H7/f7", t.includes("H7/f7"), t);
      await done(p); }

    console.log("Размерные цепи");
    { const p = await page("razmernye-cepi.html");
      await p.click("#loadExample"); await settle(p);
      const w = await text(p, "#mWorst"), pr = await text(p, "#mProb");
      check("пример: максимум-минимум 0,180 … 0,612, не проходит", w.includes("0,180") && w.includes("0,612") && w.includes("Не проходит"), w);
      check("пример: вероятностный 0,263 … 0,529, проходит", pr.includes("0,263") && pr.includes("0,529") && pr.includes("Проходит"), pr);
      await done(p); }

    console.log("Шероховатость");
    { const p = await page("sherokhovatost.html");
      await p.selectOption("#unit", "ra"); await p.fill("#val", "1,6"); await settle(p);
      const t = await text(p, "#vals"); check("Ra 1,6 → ▽6, N7, Rz ≈ 6,4", t.includes("▽6") && t.includes("N7") && t.includes("6,4"), t);
      await p.selectOption("#unit", "rz"); await p.fill("#val", "40"); await settle(p);
      const t2 = await text(p, "#vals"); check("Rz 40 → Ra 10, ▽4", t2.includes("▽4") && t2.includes("10"), t2);
      await done(p); }

    console.log("Режимы резания");
    { const p = await page("rezhimy-rezaniya.html");
      const t = await text(p, "#kpis"); check("точение стали 45 Ø50: 1 401 об/мин, 4,15 кВт", t.includes("1 401") && t.includes("4,15"), t);
      await p.click("button[data-op=thread]"); await settle(p);
      const t2 = await text(p, "#kpis"); check("резьбофрезерование M16, фреза Ø10: расчёт есть", /Подача по центру фрезы/.test(t2), t2);
      await done(p); }

    console.log("Резьбы");
    { const p = await page("rezby.html");
      await p.selectOption("#size", "16|2"); await settle(p);
      let b = await text(p, "#bolt"); check("M16-6g: d 15,962…15,682, d₂ 14,663…14,503", ["15,962", "15,682", "14,663", "14,503"].every(x => b.includes(x)), b);
      await p.selectOption("#size", "10|1.5"); await settle(p);
      const n = await text(p, "#nut"); check("M10-6H: D₂ 9,026…9,206, D₁ 8,376…8,676", ["9,026", "9,206", "8,376", "8,676"].every(x => n.includes(x)), n);
      const rows = await p.$$eval("#ttTbl tbody tr", r => r.length); check("таблица допусков: 19 резьб с крупным шагом", rows === 19, rows);
      const k = await text(p, "#kpis"); check("сверло под M10 — 8,5", k.includes("8,5"), k);
      await done(p); }

    console.log("Конусы");
    { const p = await page("konusy.html");
      let t = await text(p, "#kpis"); check("Ø30/Ø25 на 50 мм → 1 : 10, α = 5°43′29″", t.includes("1 : 10,00") && t.includes("5°43′29″"), t);
      await p.click('#norm tr[data-ni="12"]'); await settle(p);
      t = await text(p, "#kpis"); check("7:24 → α = 16°35′39″", t.includes("16°35′39″"), t);
      await done(p); }

    console.log("Гибка листа");
    { const p = await page("gibka-lista.html");
      check("50+100+50, s=2, r=2, 90° → развёртка 192,33", (await text(p, "#L")).includes("192,33"));
      check("усилие 13,6 тс на V16", (await text(p, "#kpis")).includes("13,6"));
      await done(p); }

    console.log("Раскрой листа");
    { const p = await page("raskroy-lista.html");
      await p.fill("#W", "1250"); await p.fill("#H", "2500"); await p.fill("#a", "100"); await p.fill("#b", "200"); await p.fill("#k", "0"); await p.fill("#m", "0"); await settle(p);
      check("1250×2500, деталь 100×200 без реза → 150 шт (96 %)", (await text(p, "#cnt")).startsWith("150") && (await text(p, "#kpis")).includes("96,0"), await text(p, "#cnt"));
      await p.uncheck("#rot"); await settle(p);
      check("без поворота → 144 шт", (await text(p, "#cnt")).startsWith("144"), await text(p, "#cnt"));
      await done(p); }

    console.log("Расход на сварку");
    { const p = await page("rashod-elektrodov.html");
      check("угловой k6, 10 м, РД → купить 3,16 кг, наплавлено 1,86 кг", (await text(p, "#buy")).includes("3,16") && (await text(p, "#kpis")).includes("1,86"));
      await done(p); }

    console.log("Масса металла");
    { const p = await page("massa-metalla.html");
      check("круг Ø50 сталь → 15,41 кг/м", (await text(p, "#m1")).includes("15,41"));
      await p.click("[data-s=pipe]"); await settle(p);
      check("труба 57×3,5 → 4,618 кг/м", (await text(p, "#m1")).includes("4,618"));
      await done(p); }

    console.log("Аналоги сталей");
    { const p = await page("analogi-staley.html");
      await p.fill("#q", "1.4301"); await settle(p);
      check("1.4301 → 08Х18Н10", (await text(p, "#rows")).includes("08Х18Н10"));
      await p.fill("#q", "40x"); await settle(p);
      check("40x (латиницей) находит 40Х", (await text(p, "#rows")).includes("41Cr4"));
      await done(p); }

    console.log("Дюймы");
    { const p = await page("dyuymy.html");
      await p.fill("#v", "1 3/8"); await settle(p);
      check("1 3/8″ = 34,925 мм", (await text(p, "#res")).includes("34,925"));
      await p.click('button[data-u="mm"]'); await p.fill("#v", "12"); await settle(p);
      check("12 мм ≈ 15/32″", (await text(p, "#extra")).includes("15/32″"), await text(p, "#extra"));
      check("1/2-13 UNC: шаг 1,954", (await text(p, "#unTbl")).includes("1/2-13 UNC") && (await text(p, "#unTbl")).includes("1,954"));
      await done(p); }

    console.log("Себестоимость");
    { const p = await page("sebestoimost.html");
      // круг Ø50×120 сталь: 1,8496 кг × 95 = 175,71 ₽; операции 6·2500/60+8·2800/60+3·900/60 = 250+373,33+45 = 668,33;
      // наладка (45·2500+60·2800)/60 = 1875+2800 = 4675 / 50 = 93,5; прямые 937,54; ×1,4 = 1312,56; ×1,2 = 1575,07
      const t = await text(p, "#price1"); check("пример: цена 1 575 ₽ за штуку", t.includes("1 575"), t);
      await done(p); }

    console.log("Момент затяжки");
    { const p = await page("zatyazhka.html");
      const m = await text(p, "#M"), k = await text(p, "#kpis");
      check("M10 8.8, μ 0,12: момент ≈ 50 Н·м, усилие ≈ 29,6 кН", /^(49|50),/.test(m) && k.includes("29,6"), m + " | " + k);
      await done(p); }

    console.log("Зубчатые колёса");
    { const p = await page("shesterni.html");
      check("m2, z 20/45: межосевое 65,000", (await text(p, "#aw")).includes("65,000"));
      const g = await text(p, "#g1"); check("шестерня z20: da 44, df 35, W через 3 зуба 15,32", g.includes("44,000") && g.includes("35,000") && g.includes("15,32") , g);
      check("модуль по da 52,1 и z 24 → 2", (await text(p, "#findOut")).includes("2,004"));
      await done(p); }

    console.log("Сборка с натягом");
    { const p = await page("natyag.html");
      check("Ø50 H7/s6: натяг 0,018…0,059", (await text(p, "#fitHint")).includes("0,018") && (await text(p, "#fitHint")).includes("0,059"));
      check("нагрев ступицы ≈ 202 °C → «205»", (await text(p, "#T")).startsWith("205"), await text(p, "#T"));
      await done(p); }

    console.log("G-коды");
    { const p = await page("gkody.html");
      await p.fill("#line", "G96 S220 M03"); await settle(p);
      const w = await text(p, "#words"); check("G96 S220 M03 разобран", w.includes("Постоянная скорость резания") && w.includes("220 м/мин") && w.includes("по часовой"), w);
      await p.click("[data-mode=mill]"); await p.fill("#line", "G98 G83 Z-20. R2. Q4. F140"); await settle(p);
      const w2 = await text(p, "#words"); check("G83 с Q и R разобран для фрезерного", w2.includes("Глубокое сверление") && w2.includes("Глубина за один ход") && w2.includes("Плоскость R"), w2);
      await p.fill("#q", "резьб"); await settle(p);
      check("поиск «резьб» находит G76 и G84", (await text(p, "#rows")).includes("G76") && (await text(p, "#rows")).includes("G84"));
      await done(p); }

    console.log("«Поделиться расчётом» и переходы");
    { const p = await page("rezby.html");
      await p.selectOption("#size", "24|3"); await p.selectOption("#tb", "4h"); await settle(p);
      await p.click("#sbShare"); await settle(p);
      const url = await p.evaluate(() => navigator.clipboard.readText());
      const q = await page(url.replace(/^https?:\/\/[^/]+\//, ""));
      check("ссылка открывает M24-6H/4h", (await text(q, "#notation")) === "M24-6H/4h", await text(q, "#notation"));
      await done(q);
      await p.selectOption("#size", "10|1.5"); await settle(p);
      const href = await p.getAttribute('#rel a:first-child', "href");
      const r = await page(href);
      const d = await r.inputValue("#g-D").catch(() => "");
      check("резьба M10 → режимы сверления с Ø8,5", d === "8,5" && (await r.getAttribute('button[data-op=drill]', "aria-pressed")) === "true", d);
      await done(r); await done(p); }
    { const p = await page("stati-posadka-h7-g6.html");
      const r = await page(await p.getAttribute(".cta a.go", "href"));
      check("статья H7/g6 → калькулятор посадок с Ø25 H7/g6", (await r.inputValue("#hole")) === "H7" && (await r.inputValue("#shaft")) === "g6");
      await done(r); await done(p); }
    { const p = await page("posadki.html");
      await p.fill("#nom", "50"); await p.fill("#hole", "H7"); await p.fill("#shaft", "s6"); await settle(p);
      const href = await p.getAttribute('a[href^="natyag.html"]', "href");
      const r = await page(href);
      check("посадки H7/s6 → сборка с натягом Ø50", (await r.inputValue("#d")) === "50" && (await r.inputValue("#fit")) === "H7/s6");
      await done(r); await done(p); }
    { const p = await page("gibka-lista.html");
      const href = await p.getAttribute('#rel a:first-child', "href");
      const r = await page(href);
      const b = await r.inputValue("#dm-b").catch(() => "");
      check("гибка → масса: лист шириной 192,3", b === "192,3", b);
      await done(r); await done(p); }
  } finally {
    await browser.close();
    srv.kill();
  }
  console.log(`\nИтого: ${passed} пройдено, ${failed} не пройдено`);
  process.exit(failed ? 1 : 0);
})();
