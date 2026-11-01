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
  "dyuymy.html", "sebestoimost.html", "zatyazhka.html", "shesterni.html", "natyag.html", "gkody.html", "plastiny.html", "vybor-instrumenta.html", "marki-staley.html", "podshipniki.html", "dopuski-formy.html", "cveta-pobezhalosti.html", "rezba-rezcom.html", "edinicy.html", "glossariy.html", "politika.html", "stati-kvalitet.html", "stati-posadka-podshipnika.html", "stati-termoobrabotka.html", "stati-rezba-rezcom.html", "stati-lomayutsya-metchiki.html", "stati-chertezh-oboznacheniya.html",
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

    console.log("Пластины и державки");
    { const p = await page("plastiny.html");
      await p.fill("#code", "CNMG 120408-PM"); await settle(p);
      let t = await text(p, "#pos"); check("CNMG 120408: ромб 80°, ⌀12,7, толщина 4,76, радиус 0,8", ["Ромб 80°", "⌀12,7", "4,76 мм", "0,8 мм"].every(x => t.includes(x)), t);
      await p.fill("#code", "TNMG 220408"); await settle(p);
      t = await text(p, "#pos"); check("TNMG 22… → ⌀12,7 (сторона 22 мм)", t.includes("⌀12,7"), t);
      await p.fill("#code", "CCMT 09T304"); await settle(p);
      t = await text(p, "#pos"); check("CCMT 09T304: позитивная 7°, толщина 3,97, ⌀9,525", t.includes("7°") && t.includes("3,97") && t.includes("⌀9,525"), t);
      await p.click("[data-k=hol]"); await p.fill("#code", "PCLNR 2525M12"); await settle(p);
      t = await text(p, "#pos"); check("PCLNR 2525M12: κr 95°, 25×25, длина 150", t.includes("95°") && t.includes("высота 25 × ширина 25") && t.includes("150 мм"), t);
      await done(p); }

    console.log("Выбор инструмента");
    { const p = await page("vybor-instrumenta.html");
      check("сталь, получистовая, наружное, обычные → CNMG 120408-PM, P25", (await text(p, "#code")) === "CNMG 120408-PM" && (await text(p, "#rec")).includes("P25"), await text(p, "#code"));
      await p.click('[data-q=prof][data-v=copy]'); await p.click('[data-q=op][data-v=f]'); await settle(p);
      check("чистовое копирование → пластина V, позитивная", (await text(p, "#code")).startsWith("VC"), await text(p, "#code"));
      await done(p); }

    console.log("Марки сталей");
    { const p = await page("marki-staley.html");
      const chk = async (m, must) => { await p.fill("#mark", m); await settle(p); const o = await text(p, "#out"); check(m + " → " + must.join(", "), must.every(x => o.includes(x)), o.slice(0, 160)); };
      await chk("12Х18Н10Т", ["нержавеющая аустенитная", "~0,12 %", "Хром", "~18 %", "Никель", "~10 %", "Титан"]);
      await chk("40Х", ["легированная конструкционная", "~0,4 %", "Хром"]);
      await chk("09Г2С", ["низколегированная", "Марганец", "~2 %", "Кремний"]);
      await chk("30ХГСА", ["~0,3 %", "высококачественная"]);
      await chk("ШХ15", ["шарикоподшипниковая", "~1,5 %"]);
      await chk("Р6М5", ["быстрорежущая", "Вольфрам", "~6 %", "Молибден", "~5 %"]);
      await chk("Х12МФ", ["инструментальная легированная", "~1 % и больше"]);
      await chk("20Х13", ["мартенситная"]);
      await chk("65Г", ["пружинная"]);
      await chk("СЧ20", ["Серый чугун", "200 МПа"]);
      await chk("ЛС59-1", ["Легированная латунь", "~59 %", "Свинец", "~40 %"]);
      await chk("Д16Т", ["Дюралюминий"]);
      await done(p); }

    console.log("Подшипники");
    { const p = await page("podshipniki.html");
      const chk = async (c, must) => { await p.fill("#code", c); await settle(p); const o = await text(p, "#out"); check(c + " → " + must.join(", "), must.every(x => o.includes(x)), o.slice(0, 200)); };
      await chk("180205", ["6205-2RS", "25 × 52 × 15", "два резиновых уплотнения"]);
      await chk("80205", ["6205-2Z", "две металлические"]);
      await chk("6-180206", ["6206-2RS", "класс точности 6", "30 × 62 × 16"]);
      await chk("6205-2RS", ["180205", "25 × 52 × 15"]);
      await chk("6204 ZZ C3", ["80204", "20 × 47 × 14", "C3"]);
      await chk("6005", ["105", "25 × 47 × 12"]);
      await chk("7205", ["30205", "конический"]);
      await chk("30205", ["7205"]);
      await chk("36206", ["7206C"]);
      await chk("51105", ["8105"]);
      await chk("608", ["8 × 22 × 7"]);
      await done(p); }

    console.log("Допуски формы");
    { const p = await page("dopuski-formy.html");
      const n = await p.$$eval(".sym", x => x.length); check("14 знаков допусков", n === 14, n);
      await p.click('[data-s="coax"]'); await settle(p);
      check("соосность: база обязательна, индикатор ≈ 2 × смещение", (await text(p, "#info")).includes("обязательна") && (await text(p, "#info")).includes("2 × смещение"));
      await p.selectOption("#bSym", "flat"); await p.fill("#bBase", "А"); await settle(p);
      check("конструктор: предупреждает, что у плоскостности базы нет", (await text(p, "#bText")).includes("база не указывается"));
      await done(p); }

    console.log("Цвета побежалости");
    { const p = await page("cveta-pobezhalosti.html");
      await p.fill("#t", "220"); await settle(p); check("220 °C → соломенно-жёлтый", (await text(p, "#sel")).includes("Соломенно-жёлтый"));
      await p.fill("#t", "290"); await settle(p); check("290 °C → васильково-синий", (await text(p, "#sel")).includes("Васильково-синий"));
      await p.fill("#t", "820"); await settle(p); check("820 °C → светло-вишнёвый, закалка", (await text(p, "#sel")).includes("Светло-вишнёвый") && (await text(p, "#sel")).includes("закалка"));
      await done(p); }

    console.log("Поиск по сайту");
    { const p = await page("index.html");
      await p.fill("#hq", "подшипник 180205"); await p.waitForTimeout(500);
      check("«подшипник 180205» → страница подшипников первой", ((await p.getAttribute("#hres a", "href")) || "") === "podshipniki.html", await text(p, "#hres"));
      await p.fill("#hq", "резьба"); await p.waitForTimeout(400);
      check("«резьба» находит калькулятор резьб", (await text(p, "#hres")).includes("Метрическая резьба") || (await text(p, "#hres")).includes("резьб"));
      await p.click(".sb-menu summary"); await p.fill(".sb-q", "40Х"); await p.waitForTimeout(400);
      check("поиск в меню: «40Х» находит марки и аналоги", (await text(p, ".sb-res")).includes("марки стали") && (await text(p, ".sb-res")).includes("Аналоги"), await text(p, ".sb-res"));
      await done(p); }

    console.log("Резьба резцом");
    { const p = await page("rezba-rezcom.html");
      const k = await text(p, "#kpis"), g = await p.textContent("#g76");
      check("M24×3 наружная: h 1,840, X 20,32, 10+1 проходов", k.includes("1,840") && k.includes("20,320") && k.includes("11"), k);
      check("G76: P1840 Q336 X20.32", g.includes("P1840") && g.includes("Q336") && g.includes("X20.32"), g);
      await p.selectOption("#type", "int"); await settle(p);
      check("внутренняя M24×3: последний X = 24,433", (await text(p, "#kpis")).includes("24,433"), await text(p, "#kpis"));
      await done(p); }

    console.log("Конвертер единиц");
    { const p = await page("edinicy.html");
      check("600 МПа = 61,18 кгс/мм²", (await text(p, "#units")).includes("61,18"), await text(p, "#units"));
      await p.click('[data-q="torque"]'); await p.fill("#val", "100"); await settle(p);
      check("100 Н·м = 73,756 lbf·ft", (await text(p, "#units")).includes("73,756"), await text(p, "#units"));
      await p.click('[data-q="temp"]'); await p.fill("#val", "850"); await settle(p);
      check("850 °C = 1 562 °F", (await text(p, "#units")).includes("1 562"), await text(p, "#units"));
      await done(p); }

    console.log("Глоссарий");
    { const p = await page("glossariy.html");
      const n = await p.$$eval(".gi", x => x.length); check("терминов не меньше 50", n >= 50, n);
      await p.fill("#q", "натяг"); await settle(p);
      const vis = await p.$$eval(".gi", x => x.filter(e => !e.hidden).length); check("фильтр «натяг» оставляет несколько терминов", vis >= 1 && vis < 10, vis);
      await done(p); }

    console.log("Углублённые калькуляторы");
    { const p = await page("marki-staley.html");
      const ce = async (m, w) => { await p.fill("#mark", m); await settle(p); const o = await text(p, "#out"); check(m + ": свариваемость " + w, o.includes("Свариваемость: " + w) || (w === "аустенит" && o.includes("Аустенитная нержавейка варится")), o.slice(0, 120)); };
      await ce("Ст3сп", "хорошая"); await ce("09Г2С", "удовлетворительная"); await ce("45", "ограниченная"); await ce("40Х", "плохая"); await ce("12Х18Н10Т", "аустенит");
      await done(p); }
    { const p = await page("rashod-elektrodov.html");
      await p.fill("#ts", "6"); await settle(p); const k = await text(p, "#modeK");
      check("РД, 6 мм → электрод 4 мм, ток 158–194 А", k.includes("4") && k.includes("158–194"), k);
      await done(p); }
    { const p = await page("podshipniki.html");
      check("посадка подшипника: вращается вал → k6 / H7", (await text(p, "#fitK")).includes("k6") && (await text(p, "#fitK")).includes("H7"));
      await p.selectOption("#rot", "house"); await settle(p);
      check("вращается корпус → h6 / N7", (await text(p, "#fitK")).includes("h6") && (await text(p, "#fitK")).includes("N7"));
      await done(p); }
    { const p = await page("shesterni.html");
      await p.fill("#x1", "0,5"); await settle(p);
      check("смещение x₁ = 0,5 увеличивает межосевое: aw > 65", parseFloat((await text(p, "#aw")).replace(",", ".")) > 65.5, await text(p, "#aw"));
      await p.fill("#x1", "0"); await p.fill("#z1", "12"); await settle(p);
      check("z₁ = 12 без смещения → предупреждение о подрезании", (await text(p, "#notes")).includes("подрезание"));
      const w = await text(p, "#wk"); check("червяк m4 q10 z₁1 z₂40: aw 100, u 40, γ 5,71°", w.includes("100,00") && w.includes("40,00") && w.includes("5,71"), w);
      await done(p); }
    { const p = await page("massa-metalla.html");
      await p.click("[data-s=sphere]"); await settle(p);
      check("шар Ø50 сталь → 0,514 кг", (await text(p, "#m1")).includes("0,514"), await text(p, "#m1"));
      await p.click("[data-s=sheet]"); await p.fill("#dm-b", "100"); await p.fill("#dm-t", "10"); await p.fill("#L", "100"); await settle(p);
      const m0 = await text(p, "#m1");
      await p.fill("#hn", "4"); await p.fill("#hd", "10"); await p.fill("#hh", "10"); await settle(p);
      check("пластина 100×100×10 минус 4 отв. Ø10: 0,785 → 0,760 кг", m0.includes("0,785") && (await text(p, "#m1")).includes("0,760"), m0 + " → " + await text(p, "#m1"));
      await done(p); }
    { const p = await page("rezby.html");
      const k = await text(p, "#trk"); check("Tr20×4: d₂ 18, d₃ 15,5, D₁ 16, D₄ 20,5", ["18,000", "15,500", "16,000", "20,500"].every(x => k.includes(x)), k);
      await done(p); }
    { const p = await page("rezhimy-rezaniya.html");
      check("стойкость: 220 м/мин при 15 мин → ~185 м/мин при 30 мин", (await text(p, "#tK")).includes("185"), await text(p, "#tK"));
      await done(p); }
    { const p = await page("vybor-instrumenta.html");
      check("стальная оправка Ø20 с вылетом 90 → вибрации", (await text(p, "#bOut")).includes("Будут вибрации"));
      await done(p); }

    console.log("Метрика, Вебмастер, cookie");
    { const p = await page("posadki.html");
      const html = await p.content();
      check("счётчик Метрики 113975628 и мета-тег Вебмастера на странице", html.includes("tag.js?id=113975628") && html.includes('name="yandex-verification" content="68bc83a227a58ef7"'));
      check("плашка cookie видна при первом визите", (await p.$$eval(".sb-cookie", x => x.length)) === 1);
      await p.click(".sb-cookie button"); await p.reload(); await p.waitForTimeout(300);
      check("после «Понятно» плашка больше не показывается", (await p.$$eval(".sb-cookie", x => x.length)) === 0);
      await done(p); }
    { const r = await (await browser.newContext()).newPage(); const resp = await r.goto(BASE + "yandex_68bc83a227a58ef7.html");
      check("файл подтверждения Яндекса отдаётся", resp.status() === 200 && (await r.content()).includes("Verification: 68bc83a227a58ef7")); await r.context().close(); }

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
