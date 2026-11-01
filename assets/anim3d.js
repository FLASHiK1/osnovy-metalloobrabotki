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
    var api = { set: function (p) { api._pending = p; } };
    var started = false;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        api.visible = e.isIntersecting;
        if (e.isIntersecting && !started) { started = true; init(); }
      });
    }, { rootMargin: "200px" });
    io.observe(box);
    function init() {
      loadThree().then(function (THREE) {
        box.querySelector(".a3d-msg").remove();
        var W = box.clientWidth, H = Math.round(W * (opts.ratio || 0.56));
        var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        renderer.setSize(W, H);
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
})();
