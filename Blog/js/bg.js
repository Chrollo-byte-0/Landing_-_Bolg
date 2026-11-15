// =====================================================================
// Fondo: UNA figura matemática a la vez, en secuencia.
// Cada figura aparece (fade + escala), flota unos segundos y se disuelve
// antes de que entre la siguiente. La fórmula de abajo cambia con ella.
// =====================================================================
(function () {
  const html = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isPost = !!document.querySelector(".post");
  const TAU = Math.PI * 2;
  const PERIOD = 10;   // segundos por figura
  const FADE = 1.8;    // segundos de entrada / salida

  // ---------- DOM ----------
  const grid = document.createElement("div");
  grid.className = "bg-grid";
  const canvas = document.createElement("canvas");
  canvas.className = "bg-canvas";
  document.body.prepend(canvas);
  document.body.prepend(grid);
  const ctx = canvas.getContext("2d");

  let W = 0, H = 0;
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener("resize", resize);

  // color de trazo según el tema
  let rgb = [17, 17, 17], bg = [255, 255, 255];
  function readColor() {
    const cs = getComputedStyle(html);
    const hex = (v) => v.trim().replace("#", "");
    const c = hex(cs.getPropertyValue("--text")), b = hex(cs.getPropertyValue("--bg"));
    if (c.length === 6) rgb = [0, 2, 4].map((i) => parseInt(c.substr(i, 2), 16));
    if (b.length === 6) bg = [0, 2, 4].map((i) => parseInt(b.substr(i, 2), 16));
  }
  readColor();
  new MutationObserver(readColor).observe(html, { attributes: true, attributeFilter: ["data-theme"] });
  const stroke = (a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;

  // ---------- Geometría ----------
  function surface(f, u0, u1, v0, v1, uN, vN, uSeg, vSeg) {
    const lines = [];
    for (let i = 0; i <= uN; i++) {
      const u = u0 + ((u1 - u0) * i) / uN, l = [];
      for (let j = 0; j <= vSeg; j++) l.push(f(u, v0 + ((v1 - v0) * j) / vSeg));
      lines.push({ pts: l, edge: false });
    }
    for (let j = 0; j <= vN; j++) {
      const v = v0 + ((v1 - v0) * j) / vN, l = [];
      for (let i = 0; i <= uSeg; i++) l.push(f(u0 + ((u1 - u0) * i) / uSeg, v));
      lines.push({ pts: l, edge: j === 0 || j === vN });
    }
    return lines;
  }
  const mobius = (u, v) => {
    const r = 1 + (v / 2) * Math.cos(u / 2);
    return [r * Math.cos(u), r * Math.sin(u), (v / 2) * Math.sin(u / 2)];
  };
  const torus = (u, v) => {
    const r = 1.6 + 0.6 * Math.cos(v);
    return [r * Math.cos(u), r * Math.sin(u), 0.6 * Math.sin(v)];
  };
  const klein = (u, v) => {
    const r = 2 + Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v);
    return [r * Math.cos(u), r * Math.sin(u), Math.sin(u / 2) * Math.sin(v) + Math.cos(u / 2) * Math.sin(2 * v)];
  };
  const dnaLines = (() => {
    const lines = [], h1 = [], h2 = [];
    for (let i = 0; i <= 120; i++) {
      const t = (i / 120) * 4 * Math.PI, y = (t - 2 * Math.PI) * 0.4;
      h1.push([Math.cos(t), y, Math.sin(t)]);
      h2.push([Math.cos(t + Math.PI), y, Math.sin(t + Math.PI)]);
    }
    lines.push({ pts: h1, edge: true }, { pts: h2, edge: true });
    for (let i = 0; i <= 120; i += 5) lines.push({ pts: [h1[i], h2[i]], edge: false });
    return lines;
  })();
  const knotPts = [];
  for (let i = 0; i <= 260; i++) {
    const t = (i / 260) * TAU;
    knotPts.push([Math.sin(t) + 2 * Math.sin(2 * t), Math.cos(t) - 2 * Math.cos(2 * t), -Math.sin(3 * t)]);
  }
  function balloonLines(a) {
    const lines = [];
    const pt = (ph, th) => {
      const r = a * Math.sin(ph) * (1 + 0.12 * Math.cos(ph));
      return [r * Math.cos(th), -1.3 * a * Math.cos(ph), r * Math.sin(th)];
    };
    for (let m = 0; m < 6; m++) {
      const th = (m / 6) * TAU, l = [];
      for (let i = 0; i <= 20; i++) l.push(pt((i / 20) * Math.PI, th));
      lines.push(l);
    }
    for (let p = 1; p <= 3; p++) {
      const ph = (p / 4) * Math.PI, l = [];
      for (let i = 0; i <= 28; i++) l.push(pt(ph, (i / 28) * TAU));
      lines.push(l);
    }
    return lines;
  }
  const balloons = [
    { x: -2.4, y: -5.6, z: 0.4, a: 1.05, ph: 0.0 },
    { x: -0.7, y: -7.2, z: -1.0, a: 1.15, ph: 1.7 },
    { x: 1.3, y: -6.4, z: 1.0, a: 1.0, ph: 3.1 },
    { x: 2.9, y: -5.1, z: -0.4, a: 0.95, ph: 4.6 },
  ].map((b) => ({ ...b, lines: balloonLines(b.a) }));

  // ---------- Dibujo de cada tipo de figura ----------
  // p = { cx, cy, u, a (opacidad), t (seg. de vida), mx (ratón -0.5..0.5) }
  function drawSurface(lines, size, tilt, speed, p) {
    const s = p.u * size;
    const ay = p.t * speed, ax = tilt + Math.sin(p.t * 0.4) * 0.22 + p.mx * 0.25;
    const cY = Math.cos(ay), sY = Math.sin(ay), cX = Math.cos(ax), sX = Math.sin(ax);
    ctx.strokeStyle = stroke(p.a);
    lines.forEach((ln) => {
      ctx.lineWidth = ln.edge ? 1.6 : 0.8;
      ctx.beginPath();
      ln.pts.forEach((q, j) => {
        const x1 = q[0] * cY + q[2] * sY, z1 = -q[0] * sY + q[2] * cY;
        const y2 = q[1] * cX - z1 * sX, z2 = q[1] * sX + z1 * cX;
        const k = 1 / (1 + z2 / 12);
        j ? ctx.lineTo(p.cx + x1 * k * s, p.cy + y2 * k * s) : ctx.moveTo(p.cx + x1 * k * s, p.cy + y2 * k * s);
      });
      ctx.stroke();
    });
  }

  function drawKnotAndBalloons(p) {
    // Esta escena mide ~12 unidades de alto (globos arriba, nudo abajo):
    // se ajusta a la altura de la pantalla y se centra para que NO se corte.
    const u = Math.min(p.H * 0.064, p.W * (p.wide ? 0.1 : 0.085)) * p.zoom, t = p.t;
    const cyc = p.cy + 2.9 * u;
    const tilt = 0.32 + p.mx * 0.15, ct = Math.cos(tilt), st = Math.sin(tilt);
    const proj = (x, y, z) => {
      const y2 = y * ct - z * st, z2 = y * st + z * ct, k = 1 / (1 + z2 / 16);
      return [p.cx + x * k * u, cyc + y2 * k * u, z2];
    };
    const sway = (b) => [b.x + Math.sin(t * 0.7 + b.ph) * 0.35, b.y + Math.sin(t * 0.9 + b.ph) * 0.3];

    // cuerdas
    ctx.lineWidth = 1; ctx.strokeStyle = stroke(p.a * 0.8);
    const anchor = proj(0, -2.9, 0);
    balloons.forEach((b, i) => {
      const [bx, by] = sway(b), bot = proj(bx, by + 1.3 * b.a, b.z);
      const off = Math.sin(t * 0.8 + i) * u * 0.7;
      ctx.beginPath(); ctx.moveTo(bot[0], bot[1]);
      ctx.quadraticCurveTo((bot[0] + anchor[0]) / 2 + off, (bot[1] + anchor[1]) / 2, anchor[0], anchor[1]);
      ctx.stroke();
    });
    // globos: relleno del color de fondo (para que se vean sólidos) + líneas + brillo
    balloons.forEach((b) => {
      const [bx, by] = sway(b), ang = t * 0.5 + b.ph, ca = Math.cos(ang), sa = Math.sin(ang);
      const c = proj(bx, by, b.z), k = 1 / (1 + c[2] / 16);
      const rx = b.a * 1.05 * u * k, ry = b.a * 1.3 * u * k;
      ctx.fillStyle = `rgba(${bg[0]},${bg[1]},${bg[2]},${Math.min(p.a * 1.8, 0.92)})`;
      ctx.beginPath(); ctx.ellipse(c[0], c[1], rx, ry, 0, 0, TAU); ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = stroke(Math.min(p.a * 1.5, 0.9));
      ctx.beginPath(); ctx.ellipse(c[0], c[1], rx, ry, 0, 0, TAU); ctx.stroke();   // contorno
      ctx.lineWidth = 2; ctx.strokeStyle = stroke(p.a * 0.7);
      ctx.beginPath(); ctx.arc(c[0] - rx * 0.1, c[1] - ry * 0.1, rx * 0.72, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke(); // brillo
      ctx.lineWidth = 1; ctx.strokeStyle = stroke(Math.min(p.a * 1.2, 0.8));
      b.lines.forEach((line) => {
        ctx.beginPath();
        line.forEach((q, j) => {
          const r = proj(bx + q[0] * ca + q[2] * sa, by + q[1], b.z - q[0] * sa + q[2] * ca);
          j ? ctx.lineTo(r[0], r[1]) : ctx.moveTo(r[0], r[1]);
        });
        ctx.stroke();
      });
    });
    // nudo (trazo doble = boceto)
    const ca = Math.cos(t * 0.6), sa = Math.sin(t * 0.6);
    const pts = knotPts.map(([x, y, z]) => proj(x * ca + z * sa, y, -x * sa + z * ca));
    for (let pass = 0; pass < 2; pass++) {
      const ox = pass ? 1.2 : 0, oy = pass ? -0.9 : 0;
      ctx.lineWidth = pass ? 0.8 : 1.6;
      for (let i = 1; i < pts.length; i++) {
        const depth = (pts[i][2] + 4) / 8;
        ctx.strokeStyle = stroke(p.a * (pass ? 0.5 : 1) * (1.15 - depth));
        ctx.beginPath();
        ctx.moveTo(pts[i - 1][0] + ox, pts[i - 1][1] + oy);
        ctx.lineTo(pts[i][0] + ox, pts[i][1] + oy);
        ctx.stroke();
      }
    }
  }

  // ---------- Escenas (en orden) ----------
  const L = String.raw;
  const mobiusLines = surface(mobius, 0, TAU, -1, 1, 44, 4, 120, 2);
  const torusLines = surface(torus, 0, TAU, 0, TAU, 30, 12, 64, 24);
  const kleinLines = surface(klein, 0, TAU, 0, TAU, 36, 14, 80, 30);

  const scenes = [
    { name: "Nudo trébol",
      eq: L`\begin{cases} x=\sin t+2\sin 2t \\ y=\cos t-2\cos 2t \\ z=-\sin 3t \end{cases}`,
      draw: drawKnotAndBalloons },
    { name: "Cinta de Möbius",
      eq: L`\begin{aligned} x&=(1+\tfrac v2\cos\tfrac u2)\cos u \\ y&=(1+\tfrac v2\cos\tfrac u2)\sin u \\ z&=\tfrac v2\sin\tfrac u2 \end{aligned}`,
      draw: (p) => drawSurface(mobiusLines, 2.6, 0.95, 0.5, p) },
    { name: "Toro",
      eq: L`\begin{aligned} x&=(R+r\cos v)\cos u \\ y&=(R+r\cos v)\sin u \\ z&=r\sin v \end{aligned}`,
      draw: (p) => drawSurface(torusLines, 1.9, 1.0, 0.4, p) },
    { name: "Botella de Klein",
      eq: L`\begin{aligned} r&=2+\cos\tfrac u2\sin v-\sin\tfrac u2\sin 2v \\ (x,y)&=r(\cos u,\sin u) \end{aligned}`,
      draw: (p) => drawSurface(kleinLines, 1.25, 0.5, 0.35, p) },
    { name: "Doble hélice",
      eq: L`\mathbf r_{1,2}(t)=\big(\cos(t+\phi),\ 0.4t,\ \sin(t+\phi)\big),\ \phi\in\{0,\pi\}`,
      draw: (p) => drawSurface(dnaLines, 1.7, 0.2, 0.6, p) },
  ];
  const scenesToShow = isPost ? [scenes[1]] : scenes;

  // ---------- Leyenda (nombre + fórmula + puntos) ----------
  let cap = null, capName, capEq, capDots;
  if (!isPost) {
    cap = document.createElement("div");
    cap.className = "bg-formula";
    cap.innerHTML = '<small class="cap-name"></small><div class="cap-eq"></div><div class="cap-dots"></div>';
    document.body.appendChild(cap);
    capName = cap.querySelector(".cap-name");
    capEq = cap.querySelector(".cap-eq");
    capDots = cap.querySelector(".cap-dots");
    capDots.innerHTML = scenes.map(() => "<i></i>").join("");
  }
  function renderMath(el) {
    if (window.renderMathInElement) {
      renderMathInElement(el, { delimiters: [{ left: "$$", right: "$$", display: true }] });
    }
  }
  function setCaption(i, instant) {
    if (!cap) return;
    const apply = () => {
      capName.textContent = scenes[i].name;
      capEq.innerHTML = "$$" + scenes[i].eq + "$$";
      renderMath(capEq);
      capDots.querySelectorAll("i").forEach((d, k) => d.classList.toggle("on", k === i));
      cap.classList.remove("out");
    };
    if (instant) return apply();
    cap.classList.add("out");
    setTimeout(apply, 500);
  }

  // ---------- Bucle ----------
  let mx = 0, startT = null, current = -1;
  addEventListener("mousemove", (e) => { mx = e.clientX / innerWidth - 0.5; }, { passive: true });
  const smooth = (x) => x * x * (3 - 2 * x);

  function frame(now) {
    if (!html.classList.contains("ready")) { requestAnimationFrame(frame); return; }
    if (startT === null) startT = now;
    const tt = reduce ? 4 : (now - startT) / 1000;

    const idx = Math.floor(tt / PERIOD) % scenesToShow.length;
    const local = tt % PERIOD;
    if (idx !== current) {
      current = idx;
      if (!isPost) setCaption(idx, tt < PERIOD);
    }
    // envolvente: entra, se mantiene, sale
    const env = reduce ? 1 : smooth(Math.min(local / FADE, 1)) * smooth(Math.min((PERIOD - local) / FADE, 1));

    ctx.clearRect(0, 0, W, H);
    const wide = W >= 900;
    const base = isPost ? 0.14 : wide ? 0.55 : 0.4;
    const zoom = 0.92 + 0.08 * env;
    const u = (wide ? Math.min(W, H) * 0.078 : Math.min(W * 0.07, H * 0.06)) * zoom;
    scenesToShow[idx].draw({
      cx: wide ? W * 0.72 : W * 0.5,
      cy: H * 0.5 + (1 - env) * 14 + Math.sin(tt * 0.8) * H * 0.008 - scrollY * 0.06,
      u, zoom, W, H, wide, a: base * env, t: local + idx * 3, mx,
    });

    if (!reduce) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
