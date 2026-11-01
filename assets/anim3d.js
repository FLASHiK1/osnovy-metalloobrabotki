/* 3D-анимации сайта на three.js (r128, хранится на сайте): точение пластиной и зацепление зубчатых колёс.
   Библиотека грузится только когда блок появился на экране; рендер останавливается, когда блок не виден.
   Использование:
     Anim3D.turning(контейнер, {shape:"C", kr:95, ap:2, f:0.25, re:0.8}) → {set(params)}
     Anim3D.gears(контейнер, {m:2, z1:20, z2:45, b:20})              → {set(params)} */
(function () {
  "use strict";
  var THREE_URL = "assets/vendor/three.min.js"; // three.js r128, MIT — лицензия в assets/vendor/three.LICENSE.txt
  var loading = null;
  function loadThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    if (loading) return loading;
    loading = new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = THREE_URL; s.async = true;
      s.onload = function () { res(window.THREE); };
      s.onerror = function () { loading = null; rej(new Error("three.js не загрузился")); };
      document.head.appendChild(s);
    });
    return loading;
  }
  function css(name, fb) { var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb; }
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* общий каркас: сцена, камера, свет, вращение мышью, пауза вне экрана */
  function stage(box, opts, build) {
    box.classList.add("a3d");
    box.innerHTML = '<div class="a3d-msg">Загрузка 3D…</div><div class="a3d-ui"><button type="button" class="a3d-play" aria-label="Пауза">❚❚</button><span class="a3d-hint">тяните, чтобы повернуть</span></div>';
    var api = { set: function (p) { api._pending = p; }, dead: false };
    var started = false;
    api.destroy = function () { api.dead = true; io.disconnect(); if (api._renderer) { api._renderer.dispose(); api._renderer.forceContextLoss && api._renderer.forceContextLoss(); } box.innerHTML = ""; };
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        api.visible = e.isIntersecting;
        if (e.isIntersecting && !started) { started = true; init(); }
      });
    }, { rootMargin: "200px" });
    io.observe(box);
    function init() {
      loadThree().then(function (THREE) {
        if (api.dead) return;
        box.querySelector(".a3d-msg").remove();
        var W = box.clientWidth, H = Math.round(W * (opts.ratio || 0.56));
        var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        renderer.setSize(W, H);
        api._renderer = renderer;
        box.insertBefore(renderer.domElement, box.firstChild);
        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 200);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.85));
        var dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(4, 8, 6); scene.add(dl);
        var dl2 = new THREE.DirectionalLight(0xffffff, 0.3); dl2.position.set(-6, -2, -4); scene.add(dl2);
        // орбита камеры
        var yaw = opts.yaw || 0.6, pitch = opts.pitch || 0.35, dist = opts.dist || 8, target = new THREE.Vector3(0, 0, 0);
        function place() { camera.position.set(target.x + dist * Math.cos(pitch) * Math.sin(yaw), target.y + dist * Math.sin(pitch), target.z + dist * Math.cos(pitch) * Math.cos(yaw)); camera.lookAt(target); }
        place();
        var drag = null;
        renderer.domElement.style.touchAction = "pan-y";
        renderer.domElement.addEventListener("pointerdown", function (e) { drag = [e.clientX, e.clientY, yaw, pitch]; renderer.domElement.setPointerCapture(e.pointerId); });
        renderer.domElement.addEventListener("pointermove", function (e) { if (!drag) return; yaw = drag[2] - (e.clientX - drag[0]) * 0.01; pitch = Math.max(-1.2, Math.min(1.3, drag[3] + (e.clientY - drag[1]) * 0.01)); place(); if (!running) render(); });
        renderer.domElement.addEventListener("pointerup", function () { drag = null; });
        var running = !reduce, btn = box.querySelector(".a3d-play");
        function syncBtn() { btn.textContent = running ? "❚❚" : "▶"; btn.setAttribute("aria-label", running ? "Пауза" : "Запустить"); }
        syncBtn();
        btn.addEventListener("click", function () { running = !running; syncBtn(); if (running) last = performance.now(); });
        var scn = build(THREE, scene, { css: css, camera: camera, target: target, setDist: function (d) { dist = d; place(); } });
        api.set = function (p) { scn.set(p); if (!running) render(); };
        if (api._pending) api.set(api._pending);
        function render() { renderer.render(scene, camera); }
        var last = performance.now();
        function loop(t) {
          if (api.dead) return;
          requestAnimationFrame(loop);
          var dt = Math.min(0.05, (t - last) / 1000); last = t;
          if (!api.visible || !running) return;
          scn.tick(dt); render();
        }
        scn.tick(0); render();
        requestAnimationFrame(loop);
        window.addEventListener("resize", function () { var w = box.clientWidth, h = Math.round(w * (opts.ratio || 0.56)); renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); render(); });
        // смена темы — перекрасить
        var mo = new MutationObserver(function () { if (scn.recolor) { scn.recolor(); render(); } });
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { if (scn.recolor) { scn.recolor(); render(); } });
      }).catch(function () {
        if (api.dead) return;
        box.querySelector(".a3d-msg").textContent = "3D-модель не загрузилась. Обновите страницу.";
      });
    }
    return api;
  }

  /* ---------- Точение ---------- */
  function insertShape(THREE, shape, size, re) {
    var s = new THREE.Shape(), pts = [];
    var ang = { C: 80, D: 55, V: 35, S: 90, T: 60, W: 80 }[shape] || 80;
    if (shape === "R") { s.absarc(0, 0, size * 0.5, 0, Math.PI * 2, false); return { shape: s, tip: new THREE.Vector2(size * 0.5, 0) }; }
    if (shape === "S") { var h = size * 0.5; pts = [[h * 1.41, 0], [0, h * 1.41], [-h * 1.41, 0], [0, -h * 1.41]]; }
    else if (shape === "T" || shape === "W") {
      var R = size * 0.62; for (var i = 0; i < 3; i++) { var a = i * 2 * Math.PI / 3; pts.push([R * Math.cos(a), R * Math.sin(a)]); if (shape === "W") { var a2 = a + Math.PI / 3; pts.push([R * 0.62 * Math.cos(a2), R * 0.62 * Math.sin(a2)]); } }
    } else { var a0 = ang * Math.PI / 360, L = size * 0.75; pts = [[L * Math.cos(a0), 0], [0, L * Math.sin(a0)], [-L * Math.cos(a0), 0], [0, -L * Math.sin(a0)]]; }
    s.moveTo(pts[0][0], pts[0][1]); for (var j = 1; j < pts.length; j++) s.lineTo(pts[j][0], pts[j][1]); s.lineTo(pts[0][0], pts[0][1]);
    var hole = new THREE.Path(); hole.absarc(0, 0, size * 0.12, 0, Math.PI * 2, true); s.holes.push(hole);
    return { shape: s, tip: new THREE.Vector2(pts[0][0], pts[0][1]), angle: ang };
  }
  window.Anim3D = window.Anim3D || {};
  window.Anim3D.turning = function (box, params) {
    var p = Object.assign({ shape: "C", kr: 95, ap: 2, f: 0.25, re: 0.8, mat: "P" }, params || {});
    return stage(box, { ratio: 0.52, yaw: 0.55, pitch: 0.42, dist: 9.5 }, function (THREE, scene, ctx) {
      var Lw = 7, R0 = 1.25, x0 = -Lw / 2, x1 = Lw / 2;
      var cv = document.createElement("canvas"); cv.width = 256; cv.height = 64;
      var g = cv.getContext("2d");
      function paintTex() { g.fillStyle = "#6f6a63"; g.fillRect(0, 0, 256, 64); for (var i = 0; i < 16; i++) { g.fillStyle = i % 2 ? "#5f5a54" : "#7c766e"; g.fillRect(i * 16, 0, 16, 64); } }
      paintTex();
      var tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 1);
      var metal = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.15, roughness: 0.85 });   // исходная поверхность с окалиной
      var shiny = new THREE.MeshStandardMaterial({ color: 0xdfe4e8, metalness: 0.3, roughness: 0.22 });   // обработанная поверхность
      var work = new THREE.Group(); scene.add(work);
      var raw = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 64, 1), metal);
      var cut = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 64, 1), shiny);
      var step = new THREE.Mesh(new THREE.RingGeometry(0.5, 1, 64), metal);
      raw.rotation.z = cut.rotation.z = Math.PI / 2; step.rotation.y = Math.PI / 2;
      work.add(raw, cut, step);
      // патрон
      var chuck = new THREE.Mesh(new THREE.CylinderGeometry(R0 * 1.9, R0 * 1.9, 0.9, 48), new THREE.MeshStandardMaterial({ color: 0x3a4248, metalness: 0.6, roughness: 0.5 }));
      chuck.rotation.z = Math.PI / 2; chuck.position.x = x0 - 0.45; work.add(chuck);
      for (var k = 0; k < 3; k++) { var jaw = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.5), new THREE.MeshStandardMaterial({ color: 0x59636b, metalness: 0.6, roughness: 0.45 })); var a = k * 2 * Math.PI / 3; jaw.position.set(x0 + 0.2, Math.cos(a) * (R0 + 0.22), Math.sin(a) * (R0 + 0.22)); jaw.rotation.x = -a; work.add(jaw); }
      // резец: державка + пластина
      var tool = new THREE.Group(); scene.add(tool);
      var holderMat = new THREE.MeshStandardMaterial({ color: 0x2f3a42, metalness: 0.5, roughness: 0.45 });
      var insMat = new THREE.MeshStandardMaterial({ color: 0xc6a24a, metalness: 0.7, roughness: 0.3 });
      var holder = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 3.2), holderMat); tool.add(holder);
      var insert = null, tipLocal = new THREE.Vector3();
      // стружка
      var chips = [], chipMat = new THREE.MeshStandardMaterial({ color: 0x9a6a3c, metalness: 0.6, roughness: 0.35 });
      function recolor() { var hot = ctx.css("--hot", "#a3512a"); chipMat.color.set(p.mat === "N" ? 0xd8dde2 : p.mat === "K" ? 0x6b6f73 : hot); insMat.color.set(0xc6a24a); }
      function buildInsert() {
        if (insert) { tool.remove(insert); insert.children[0].geometry.dispose(); }
        var sz = 0.95, ins = insertShape(THREE, p.shape, sz, p.re);
        var geo = new THREE.ExtrudeGeometry(ins.shape, { depth: 0.16, bevelEnabled: false, curveSegments: 24 });
        var mesh = new THREE.Mesh(geo, insMat);
        mesh.rotation.x = -Math.PI / 2;            // пластина лежит горизонтально, передняя поверхность вверх
        insert = new THREE.Group(); insert.add(mesh);
        var phi = Math.PI / 2 + (p.kr - 90) * Math.PI / 180;   // вершина к оси детали, поворот на угол в плане
        insert.rotation.y = phi;
        tool.add(insert);
        tipLocal.set(ins.tip.x * Math.cos(phi), 0.08, -ins.tip.x * Math.sin(phi));
        holder.position.set(0, -0.2, 1.7);
      }
      var tx = x1, apS = 0.3, spin = 0, t = 0;
      function geom() {
        apS = Math.max(0.06, Math.min(0.55, p.ap * 0.11));
        var Rc = R0 - apS;
        raw.scale.set(R0, Math.max(0.001, tx - x0), R0); raw.position.x = (x0 + tx) / 2;
        cut.scale.set(Rc, Math.max(0.001, x1 - tx), Rc); cut.position.x = (tx + x1) / 2;
        cut.visible = x1 - tx > 0.002;
        step.geometry.dispose(); step.geometry = new THREE.RingGeometry(Rc, R0, 64); step.position.x = tx;
        tool.position.set(tx - tipLocal.x, -tipLocal.y, Rc - tipLocal.z);
      }
      function spawnChip() {
        var curl = new THREE.TorusGeometry(0.12 + Math.random() * 0.08, 0.025 + apS * 0.03, 6, 14, Math.PI * (1 + Math.random()));
        var m = new THREE.Mesh(curl, chipMat);
        m.position.set(tx, 0.05, R0 - apS + 0.05);
        m.userData = { v: new THREE.Vector3(0.6 + Math.random() * 0.6, 1.4 + Math.random() * 0.8, 0.6 + Math.random() * 0.6), r: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6), life: 0 };
        scene.add(m); chips.push(m);
      }
      buildInsert(); recolor(); geom();
      var acc = 0;
      return {
        recolor: recolor,
        set: function (np) { var re = np.shape !== p.shape || np.kr !== p.kr; Object.assign(p, np); if (re) buildInsert(); recolor(); geom(); },
        tick: function (dt) {
          t += dt;
          spin += dt * 9; work.rotation.x = spin;
          tex.offset.x = 0;
          var speed = 0.45 + p.f * 2.2;      // скорость подачи на экране
          tx -= speed * dt;
          if (tx < x0 + 0.35) { tx = x1 + 0.6; }
          var cutting = tx < x1 && tx > x0 + 0.35;
          geom();
          if (cutting) { acc += dt * (8 + p.f * 30); while (acc > 1) { acc -= 1; spawnChip(); } }
          for (var i = chips.length - 1; i >= 0; i--) {
            var c = chips[i], u = c.userData; u.life += dt;
            u.v.y -= 6 * dt; c.position.addScaledVector(u.v, dt);
            c.rotation.x += u.r.x * dt; c.rotation.y += u.r.y * dt; c.rotation.z += u.r.z * dt;
            if (u.life > 1.4 || c.position.y < -3) { scene.remove(c); c.geometry.dispose(); chips.splice(i, 1); }
          }
        }
      };
    });
  };

  /* ---------- Зубчатые колёса ---------- */
  function gearShape(THREE, m, z, alphaDeg) {
    var a = alphaDeg * Math.PI / 180, r = m * z / 2, rb = r * Math.cos(a), ra = r + m, rf = r - 1.25 * m;
    var inv = function (x) { return Math.tan(x) - x; };
    var psi = function (rho) { var ar = Math.acos(Math.min(1, rb / rho)); return Math.PI / (2 * z) + inv(a) - inv(ar); };
    var s = new THREE.Shape(), first = true, N = 7;
    function pt(rr, ang) { var x = rr * Math.cos(ang), y = rr * Math.sin(ang); if (first) { s.moveTo(x, y); first = false; } else s.lineTo(x, y); }
    var rStart = Math.max(rb, rf);
    for (var i = 0; i < z; i++) {
      var c = i * 2 * Math.PI / z;
      // впадина до зуба
      var prevEnd = c - 2 * Math.PI / z + psi(rStart), thisStart = c - psi(rStart);
      for (var q = 0; q <= 3; q++) pt(rf, prevEnd + (thisStart - prevEnd) * q / 3);
      if (rf < rb) pt(rb, thisStart);
      for (var k = 0; k <= N; k++) { var rho = rStart + (ra - rStart) * k / N; pt(rho, c - psi(rho)); }
      for (var k2 = 1; k2 <= 3; k2++) pt(ra, c - psi(ra) + 2 * psi(ra) * k2 / 3);
      for (var k3 = N; k3 >= 0; k3--) { var rho2 = rStart + (ra - rStart) * k3 / N; pt(rho2, c + psi(rho2)); }
      if (rf < rb) pt(rf, c + psi(rStart));
    }
    var hole = new THREE.Path(); hole.absarc(0, 0, Math.max(r * 0.22, m * 1.5), 0, Math.PI * 2, true); s.holes.push(hole);
    return { shape: s, r: r, ra: ra };
  }
  window.Anim3D.gears = function (box, params) {
    var p = Object.assign({ m: 2, z1: 20, z2: 45, b: 20, alpha: 20 }, params || {});
    return stage(box, { ratio: 0.55, yaw: 0.35, pitch: 0.5, dist: 10 }, function (THREE, scene, ctx) {
      var root = new THREE.Group(); scene.add(root);
      var m1 = new THREE.MeshStandardMaterial({ metalness: 0.55, roughness: 0.35 }), m2 = new THREE.MeshStandardMaterial({ metalness: 0.55, roughness: 0.35 });
      var g1 = null, g2 = null, ang = 0, sc = 1, ratio = 1, a = 1, off2 = 0;
      function recolor() { m1.color.set(ctx.css("--accent", "#1d5a7a")); m2.color.set(ctx.css("--hot", "#a3512a")); }
      function make(z) {
        var gs = gearShape(THREE, p.m, z, p.alpha);
        var geo = new THREE.ExtrudeGeometry(gs.shape, { depth: Math.max(p.b, p.m * 3), bevelEnabled: true, bevelThickness: p.m * 0.08, bevelSize: p.m * 0.06, bevelSegments: 1, curveSegments: 12 });
        geo.translate(0, 0, -Math.max(p.b, p.m * 3) / 2);
        return geo;
      }
      function rebuild() {
        [g1, g2].forEach(function (g) { if (g) { root.remove(g); g.geometry.dispose(); } });
        var z1 = Math.max(6, Math.min(200, Math.round(p.z1))), z2 = Math.max(6, Math.min(200, Math.round(p.z2)));
        g1 = new THREE.Mesh(make(z1), m1); g2 = new THREE.Mesh(make(z2), m2);
        a = p.m * (z1 + z2) / 2; ratio = z1 / z2;
        var ra1 = p.m * z1 / 2 + p.m, ra2 = p.m * z2 / 2 + p.m;
        sc = 6.4 / (ra1 + a + ra2);
        root.scale.set(sc, sc, sc);
        g1.position.x = -a / 2 - (ra2 - ra1) / 2 * 0; g2.position.x = a / 2;
        root.position.x = -((ra2 - ra1) / 2) * sc;
        root.rotation.x = -Math.PI / 2 + 0.0;
        off2 = Math.PI - Math.PI / z2;
        root.add(g1, g2);
        ctx.setDist(10);
      }
      recolor(); rebuild();
      return {
        recolor: recolor,
        set: function (np) { Object.assign(p, np); rebuild(); this.tick(0); },
        tick: function (dt) { ang += dt * 0.6; g1.rotation.z = ang; g2.rotation.z = off2 - ang * ratio; }
      };
    });
  };

  /* ---------- Гибка листа на листогибе ---------- */
  window.Anim3D.bending = function (box, params) {
    var p = Object.assign({ s: 2, r: 2, beta: 90, a: 50, b: 50, V: 16, L: 1000 }, params || {});
    return stage(box, { ratio: 0.55, yaw: 0.12, pitch: 0.1, dist: 10.5 }, function (THREE, scene, ctx) {
      var sheetMat = new THREE.MeshStandardMaterial({ color: 0xd9e0e6, metalness: 0.25, roughness: 0.35, side: THREE.DoubleSide });
      var toolMat = new THREE.MeshStandardMaterial({ color: 0x55616a, metalness: 0.3, roughness: 0.5 });
      var sheet = null, die = null, punch = null, k = 1, depthZ = 3, theta = 0, t = 0;
      function recolor() { sheetMat.color.set(0xc9d0d6); }
      function extrude(shape, d) { var g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 8 }); g.translate(0, 0, -d / 2); return g; }
      function rebuildTools() {
        [die, punch].forEach(function (m) { if (m) { scene.remove(m); m.geometry.dispose(); } });
        k = 6 / Math.max(p.a + p.b, p.V * 3);
        depthZ = 3;
        var V = p.V * k, hD = Math.max(0.8, V * 0.9), wD = Math.max(V * 2.2, 1.6), vDepth = V / 2 * Math.tan(44 * Math.PI / 180);
        var ds = new THREE.Shape(); ds.moveTo(-wD / 2, -hD); ds.lineTo(wD / 2, -hD); ds.lineTo(wD / 2, 0); ds.lineTo(V / 2, 0); ds.lineTo(0, -Math.min(vDepth, hD * 0.85)); ds.lineTo(-V / 2, 0); ds.lineTo(-wD / 2, 0); ds.lineTo(-wD / 2, -hD);
        die = new THREE.Mesh(extrude(ds, depthZ), toolMat); scene.add(die);
        var pw = Math.max(0.35, V * 0.32), ph = 2.6, tipR = Math.max(0.02, p.r * k * 0.8);
        var ps = new THREE.Shape(); var half = 44 * Math.PI / 180;
        ps.moveTo(-tipR * Math.cos(half), tipR * (1 - Math.sin(half)));
        ps.absarc(0, tipR, tipR, Math.PI + half, -half, false);
        ps.lineTo(pw, pw / Math.tan(half)); ps.lineTo(pw, ph); ps.lineTo(-pw, ph); ps.lineTo(-pw, pw / Math.tan(half)); ps.lineTo(-tipR * Math.cos(half), tipR * (1 - Math.sin(half)));
        punch = new THREE.Mesh(extrude(ps, depthZ * 1.02), toolMat); scene.add(punch);
      }
      function profile(th) {
        // средняя линия: дуга внизу + две полки, наклонённые на th/2
        var s = p.s * k, rm = (p.r + p.s / 2) * k, a = p.a * k * 0.5, b = p.b * k * 0.5, pts = [], n = 12;
        var h = th / 2;
        var c = { x: 0, y: rm };
        var arc = []; for (var i = 0; i <= n; i++) { var ang = -Math.PI / 2 - h + 2 * h * i / n; arc.push([c.x + rm * Math.cos(ang), c.y + rm * Math.sin(ang), ang]); }
        var L0 = arc[0], L1 = arc[n];
        var dL = [-Math.cos(h), -Math.sin(h)], dR = [Math.cos(h), -Math.sin(h)];   // наружу от дуги
        dL = [-Math.cos(h), Math.sin(h)]; dR = [Math.cos(h), Math.sin(h)];
        var mid = [[L0[0] + dL[0] * a, L0[1] + dL[1] * a]].concat(arc.map(function (q) { return [q[0], q[1]]; })).concat([[L1[0] + dR[0] * b, L1[1] + dR[1] * b]]);
        // смещение на ±s/2 по нормали
        function off(sg) { return mid.map(function (q, i) { var a1 = mid[Math.max(0, i - 1)], a2 = mid[Math.min(mid.length - 1, i + 1)]; var tx = a2[0] - a1[0], ty = a2[1] - a1[1], l = Math.hypot(tx, ty) || 1; return [q[0] - ty / l * sg * s / 2, q[1] + tx / l * sg * s / 2]; }); }
        var top = off(1), bot = off(-1).reverse();
        var shp = new THREE.Shape(); shp.moveTo(top[0][0], top[0][1]); top.concat(bot).forEach(function (q) { shp.lineTo(q[0], q[1]); }); shp.lineTo(top[0][0], top[0][1]);
        return { shape: shp, bottom: -s / 2 };
      }
      function rebuildSheet() {
        if (sheet) { scene.remove(sheet); sheet.geometry.dispose(); }
        var pr = profile(theta * Math.PI / 180);
        sheet = new THREE.Mesh(extrude(pr.shape, depthZ * 0.92), sheetMat); scene.add(sheet);
        var V = p.V * k, sink = Math.min(V / 2 * Math.tan(theta * Math.PI / 360), V / 2 * Math.tan(44 * Math.PI / 180) * 0.9);
        sheet.position.y = p.s * k / 2 - sink;
        punch.position.y = sheet.position.y + p.s * k / 2 + 0.002 + (p.s * k / 2 - p.s * k / 2);
      }
      rebuildTools(); recolor(); rebuildSheet();
      return {
        recolor: recolor,
        set: function (np) { Object.assign(p, np); rebuildTools(); rebuildSheet(); },
        tick: function (dt) {
          t += dt; var T = 4.2, ph = t % T;
          var target = Math.min(170, p.beta);
          theta = ph < 2.4 ? target * (ph / 2.4) : ph < 3.4 ? target : target;
          rebuildSheet();
          if (ph >= 3.4) { punch.position.y += (ph - 3.4) * 2.5; sheet.position.y += Math.min(0.6, (ph - 3.4) * 0.8); }
        }
      };
    });
  };

  /* ---------- Сверление с выводом (G83) ---------- */
  window.Anim3D.drilling = function (box, params) {
    var p = Object.assign({ D: 10, L: 30 }, params || {});
    return stage(box, { ratio: 0.6, yaw: 0.7, pitch: 0.28, dist: 9 }, function (THREE, scene, ctx) {
      var blockMat = new THREE.MeshStandardMaterial({ color: 0x9aa3aa, metalness: 0.3, roughness: 0.6, transparent: true, opacity: 0.35, depthWrite: false });
      var holeMat = new THREE.MeshStandardMaterial({ color: 0x3b444a, metalness: 0.2, roughness: 0.7, side: THREE.BackSide });   // видна только внутренняя стенка
      var drillMat = new THREE.MeshStandardMaterial({ color: 0xe0c48e, metalness: 0.35, roughness: 0.3 });
      var chipMat = new THREE.MeshStandardMaterial({ color: 0x9a6a3c, metalness: 0.6, roughness: 0.35 });
      var cv = document.createElement("canvas"); cv.width = 64; cv.height = 256; var g = cv.getContext("2d");
      g.fillStyle = "#b08d57"; g.fillRect(0, 0, 64, 256); g.strokeStyle = "#5e4a2c"; g.lineWidth = 10; for (var i = -4; i < 8; i++) { g.beginPath(); g.moveTo(0, i * 48); g.lineTo(64, i * 48 + 40); g.stroke(); }
      var tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; drillMat.map = tex;
      var block, hole, drill, k, Lk, Rk, top, peck, depth = 0, maxDepth = 0, phase = "down", y = 0, chips = [], t = 0;
      function recolor() { chipMat.color.set(ctx.css("--hot", "#a3512a")); }
      function build() {
        [block, hole, drill].forEach(function (m) { if (m) scene.remove(m); });
        k = 4.2 / Math.max(p.L * 1.35, p.D * 4); Lk = p.L * k; Rk = p.D / 2 * k; top = Lk * 0.65;
        var bw = Math.max(Rk * 7, 2.4), bh = Lk * 1.3;
        block = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bw), blockMat); block.position.y = top - bh / 2; scene.add(block);
        hole = new THREE.Mesh(new THREE.CylinderGeometry(Rk * 1.02, Rk * 1.02, 1, 32, 1, true), holeMat); scene.add(hole);
        drill = new THREE.Group();
        var tipH = Rk / Math.tan(59 * Math.PI / 180);
        var tip = new THREE.Mesh(new THREE.ConeGeometry(Rk, tipH, 32), drillMat); tip.rotation.x = Math.PI; tip.position.y = tipH / 2;
        var body = new THREE.Mesh(new THREE.CylinderGeometry(Rk, Rk, Lk * 1.2, 32), drillMat); body.position.y = tipH + Lk * 0.6;
        var shank = new THREE.Mesh(new THREE.CylinderGeometry(Rk, Rk, Lk * 0.5, 32), new THREE.MeshStandardMaterial({ color: 0xb6bdc3, metalness: 0.35, roughness: 0.3 })); shank.position.y = tipH + Lk * 1.2 + Lk * 0.25;
        drill.add(tip, body, shank); scene.add(drill);
        peck = p.L / p.D > 3 ? Math.max(Rk * 2, Lk / 6) : Lk;   // G83 при глубине > 3D
        depth = 0; maxDepth = 0; phase = "down"; y = top + Rk;
        ctx.target.set(0, top - Lk / 2, 0); ctx.setDist(9);
      }
      function chip() { var m = new THREE.Mesh(new THREE.TorusGeometry(Rk * 0.35, Rk * 0.08, 5, 10, Math.PI * 1.4), chipMat); m.position.set((Math.random() - 0.5) * Rk, top, (Math.random() - 0.5) * Rk); m.userData = { v: new THREE.Vector3((Math.random() - 0.5) * 2, 2 + Math.random() * 1.5, (Math.random() - 0.5) * 2), life: 0 }; scene.add(m); chips.push(m); }
      recolor(); build();
      var fast = 3.2, feed = 0.55, acc = 0;
      return {
        recolor: recolor,
        set: function (np) { Object.assign(p, np); build(); },
        tick: function (dt) {
          t += dt; drill.rotation.y += dt * 18;
          var bottom = top - maxDepth;
          if (phase === "down") { var goal = Math.min(Lk, maxDepth + peck); var cur = top - y; var spd = cur < maxDepth - 0.02 ? fast : feed; y -= spd * dt; if (top - y > maxDepth) { maxDepth = Math.min(goal, top - y); acc += dt * 14; while (acc > 1) { acc -= 1; chip(); } } if (top - y >= goal) { y = top - goal; phase = goal >= Lk - 1e-6 ? "out" : "up"; } }
          else if (phase === "up") { y += fast * dt; if (y >= top + Rk * 0.6) phase = "down"; }
          else if (phase === "out") { y += fast * dt; if (y >= top + Lk * 0.6) { maxDepth = 0; y = top + Rk; phase = "down"; } }
          drill.position.y = y;
          hole.visible = maxDepth > 0.001; hole.scale.y = Math.max(0.001, maxDepth); hole.position.y = top - maxDepth / 2;
          for (var i = chips.length - 1; i >= 0; i--) { var c = chips[i], u = c.userData; u.life += dt; u.v.y -= 7 * dt; c.position.addScaledVector(u.v, dt); c.rotation.x += 5 * dt; c.rotation.z += 4 * dt; if (u.life > 1.2) { scene.remove(c); c.geometry.dispose(); chips.splice(i, 1); } }
        }
      };
    });
  };

  /* ---------- Концевое фрезерование уступа ---------- */
  window.Anim3D.milling = function (box, params) {
    var p = Object.assign({ Dc: 20, ae: 10, ap: 5, z: 4, fz: 0.08 }, params || {});
    return stage(box, { ratio: 0.55, yaw: 0.75, pitch: 0.5, dist: 10 }, function (THREE, scene, ctx) {
      var raw = new THREE.MeshStandardMaterial({ color: 0x7a746c, metalness: 0.15, roughness: 0.85 });
      var cutM = new THREE.MeshStandardMaterial({ color: 0xdfe4e8, metalness: 0.3, roughness: 0.25 });
      var toolM = new THREE.MeshStandardMaterial({ color: 0xc3c9ce, metalness: 0.35, roughness: 0.3 });
      var chipMat = new THREE.MeshStandardMaterial({ color: 0x9a6a3c, metalness: 0.6, roughness: 0.35 });
      var cv = document.createElement("canvas"); cv.width = 128; cv.height = 128; var g = cv.getContext("2d");
      g.fillStyle = "#a7aeb4"; g.fillRect(0, 0, 128, 128); g.strokeStyle = "#4b5157"; g.lineWidth = 9; for (var i = -3; i < 6; i++) { g.beginPath(); g.moveTo(0, i * 32); g.lineTo(128, i * 32 + 60); g.stroke(); }
      var tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; toolM.map = tex;
      var grp = new THREE.Group(); scene.add(grp);
      var ahead, b1, b2, tool, k, W, H, Lx = 6.5, x, chips = [], acc = 0;
      function recolor() { chipMat.color.set(ctx.css("--hot", "#a3512a")); }
      function build() {
        while (grp.children.length) grp.remove(grp.children[0]);
        var ae = Math.min(p.ae, p.Dc);
        k = 1.4 / p.Dc; W = Math.max(ae * k + 1.4, 2.2); H = Math.max(p.ap * k + 0.9, 1.6);
        ahead = new THREE.Mesh(new THREE.BoxGeometry(1, H, W), raw);
        b1 = new THREE.Mesh(new THREE.BoxGeometry(1, H - p.ap * k, W), raw);
        b2 = new THREE.Mesh(new THREE.BoxGeometry(1, p.ap * k, W - ae * k), raw);
        var face1 = new THREE.Mesh(new THREE.PlaneGeometry(1, ae * k), cutM); face1.rotation.x = -Math.PI / 2;   // дно уступа
        var face2 = new THREE.Mesh(new THREE.PlaneGeometry(1, p.ap * k), cutM);                                    // стенка уступа
        b1.userData.f1 = face1; b2.userData.f2 = face2;
        grp.add(ahead, b1, b2, face1, face2);
        var R = p.Dc / 2 * k, len = Math.max(p.ap * k * 1.6, 1.6);
        tool = new THREE.Group();
        var body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, len, 32), toolM); body.position.y = len / 2;
        var sh = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.95, R * 0.95, 1.6, 32), new THREE.MeshStandardMaterial({ color: 0x9aa2a8, metalness: 0.35, roughness: 0.3 })); sh.position.y = len + 0.8;
        tool.add(body, sh); grp.add(tool);
        tool.position.y = H / 2 - p.ap * k; tool.position.z = W / 2 - ae * k + R;
        x = Lx / 2 + R; ctx.setDist(10);
        grp.userData = { ae: ae, R: R };
      }
      function place() {
        var ae = grp.userData.ae, R = grp.userData.R, x0 = -Lx / 2, x1 = Lx / 2, cx = Math.max(x0, Math.min(x1, x));
        ahead.scale.x = Math.max(0.001, cx - x0); ahead.position.x = (x0 + cx) / 2;
        var bl = Math.max(0.001, x1 - cx);
        b1.scale.x = bl; b1.position.set((cx + x1) / 2, -p.ap * k / 2, 0);
        b2.scale.x = bl; b2.position.set((cx + x1) / 2, H / 2 - p.ap * k / 2, -ae * k / 2);
        var f1 = b1.userData.f1, f2 = b2.userData.f2;
        f1.scale.x = bl; f1.position.set((cx + x1) / 2, H / 2 - p.ap * k + 0.001, W / 2 - ae * k / 2);
        f2.scale.x = bl; f2.position.set((cx + x1) / 2, H / 2 - p.ap * k / 2, W / 2 - ae * k + 0.001);
        [ahead, b1, b2, f1, f2].forEach(function (m) { m.visible = m.scale.x > 0.002; });
        tool.position.x = x;
      }
      recolor(); build(); place();
      return {
        recolor: recolor,
        set: function (np) { Object.assign(p, np); build(); place(); },
        tick: function (dt) {
          tool.rotation.y -= dt * 14;
          x -= dt * (0.5 + p.fz * p.z * 3);
          if (x < -Lx / 2 - grp.userData.R * 1.2) x = Lx / 2 + grp.userData.R * 1.2;
          place();
          if (x < Lx / 2 + grp.userData.R && x > -Lx / 2) { acc += dt * 16; while (acc > 1) { acc -= 1; var m = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 4, 8, Math.PI * 1.3), chipMat); m.position.set(x - grp.userData.R * 0.6, H / 2 - p.ap * k * Math.random(), W / 2 - grp.userData.ae * k); m.userData = { v: new THREE.Vector3(1 + Math.random(), 1.5 + Math.random(), 1.2 + Math.random()), life: 0 }; grp.add(m); chips.push(m); } }
          for (var i = chips.length - 1; i >= 0; i--) { var c = chips[i], u = c.userData; u.life += dt; u.v.y -= 6 * dt; c.position.addScaledVector(u.v, dt); c.rotation.x += 6 * dt; if (u.life > 1) { grp.remove(c); c.geometry.dispose(); chips.splice(i, 1); } }
        }
      };
    });
  };

  /* ---------- Резьбофрезерование ---------- */
  window.Anim3D.threadmill = function (box, params) {
    var p = Object.assign({ D: 16, P: 2, Dc: 10, L: 20, type: "int", kind: "multi" }, params || {});
    return stage(box, { ratio: 0.6, yaw: 0.6, pitch: 0.55, dist: 9 }, function (THREE, scene, ctx) {
      var partMat = new THREE.MeshStandardMaterial({ color: 0x9aa3aa, metalness: 0.3, roughness: 0.55, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
      var grooveMat = new THREE.MeshStandardMaterial({ color: 0xc94f1a, metalness: 0.4, roughness: 0.4 });
      var toolM = new THREE.MeshStandardMaterial({ color: 0x8f969c, metalness: 0.75, roughness: 0.25 });
      var grp = new THREE.Group(); scene.add(grp);
      var tubes = [], tool, k, turns, ecc, Lk, Pk, ang = 0, rows, t = 0;
      function recolor() { grooveMat.color.set(ctx.css("--hot", "#a3512a")); }
      function build() {
        while (grp.children.length) { var c = grp.children[0]; grp.remove(c); if (c.geometry) c.geometry.dispose(); }
        tubes = [];
        var isInt = p.type === "int";
        k = 3.2 / Math.max(p.D * 1.6, p.L * 1.2); Lk = p.L * k; Pk = p.P * k;
        var Rk = p.D / 2 * k, Rc = p.Dc / 2 * k;
        ecc = isInt ? Rk - Rc : Rk + Rc;
        // деталь
        if (isInt) { var outer = new THREE.Mesh(new THREE.CylinderGeometry(Rk * 2.2, Rk * 2.2, Lk * 1.15, 48, 1, true), partMat); var inner = new THREE.Mesh(new THREE.CylinderGeometry(Rk, Rk, Lk * 1.15, 48, 1, true), partMat); grp.add(outer, inner); }
        else { grp.add(new THREE.Mesh(new THREE.CylinderGeometry(Rk - 0.6 * Pk, Rk - 0.6 * Pk, Lk * 1.15, 48), new THREE.MeshStandardMaterial({ color: 0xb9c0c6, metalness: 0.35, roughness: 0.4 }))); }
        // витки резьбы (по одному обороту), раскрываются по мере прохода фрезы
        turns = Math.max(1, Math.floor(p.L / p.P));
        rows = p.kind === "multi" ? Math.min(turns, 14) : 1;
        for (var i = 0; i < Math.min(turns, 14); i++) {
          var y0 = -Lk / 2 + i * Pk;
          var curve = new THREE.Curve(); curve.getPoint = (function (yy) { return function (u) { var a = u * Math.PI * 2; return new THREE.Vector3(Rk * Math.cos(a), yy + u * Pk, Rk * Math.sin(a)); }; })(y0);
          var geo = new THREE.TubeGeometry(curve, 64, Math.max(0.025, Pk * 0.22), 6, false);
          var m = new THREE.Mesh(geo, grooveMat); m.geometry.setDrawRange(0, 0); grp.add(m); tubes.push(m);
        }
        // фреза
        tool = new THREE.Group();
        var bodyH = p.kind === "multi" ? rows * Pk + Pk : Pk * 1.5;
        var core = new THREE.Mesh(new THREE.CylinderGeometry(Rc * 0.7, Rc * 0.7, bodyH + 2, 24), toolM); core.position.y = (bodyH + 2) / 2;
        tool.add(core);
        var nr = p.kind === "multi" ? rows : 1;
        for (var j = 0; j < nr; j++) { var ring = new THREE.Mesh(new THREE.CylinderGeometry(Rc, Rc * 0.7, Pk * 0.5, 24), toolM); ring.position.y = Pk * 0.5 + j * Pk; tool.add(ring); }
        grp.add(tool);
        ang = 0; t = 0;
        ctx.target.set(0, 0, 0); ctx.setDist(9);
      }
      recolor(); build();
      var per = 64 * 6 * 6;   // индексов на один оборот трубки
      return {
        recolor: recolor,
        set: function (np) { Object.assign(p, np); build(); },
        tick: function (dt) {
          var total = p.kind === "multi" ? 1 : Math.min(turns, 14);   // оборотов по траектории
          t += dt * 0.45;
          var cyc = t % (total + 0.8), prog = Math.min(cyc, total);
          var a = prog * Math.PI * 2;
          var yb = -Lk / 2 + (p.kind === "multi" ? prog * Pk : prog * Pk);
          tool.position.set(ecc * Math.cos(a), yb - Pk * 0.25, ecc * Math.sin(a));
          tool.rotation.y += dt * 16;
          for (var i = 0; i < tubes.length; i++) {
            var f = p.kind === "multi" ? (i < rows ? prog : 0) : Math.max(0, Math.min(1, prog - i));
            if (cyc > total + 0.6) f = 0;
            tubes[i].geometry.setDrawRange(0, Math.floor(f * per));
          }
        }
      };
    });
  };
})();
