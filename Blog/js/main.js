// ---------- Tema claro / oscuro ----------
const root = document.documentElement;
const toggle = document.getElementById("theme-toggle");

function applyTheme(theme) {
  root.setAttribute("data-theme", theme);
  if (toggle) toggle.textContent = theme === "dark" ? "Claro" : "Oscuro";
}

let saved = null;
try { saved = localStorage.getItem("theme"); } catch (e) {}
applyTheme(saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

if (toggle) {
  toggle.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });
}

// ---------- Filtro de entradas ----------
document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const cat = btn.dataset.cat;
    let i = 0;
    document.querySelectorAll(".entry").forEach((entry) => {
      const show = cat === "todo" || entry.dataset.cat === cat;
      entry.classList.toggle("hidden", !show);
      entry.classList.remove("pop");
      if (show) {
        entry.classList.add("in");
        entry.style.animationDelay = `${i++ * 60}ms`;
        void entry.offsetWidth; // reinicia la animación
        entry.classList.add("pop");
      }
    });
  });
});

// ---------- Aparición al hacer scroll ----------
const postParts = document.querySelectorAll(".post > *");
postParts.forEach((el) => el.classList.add("reveal"));

const items = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  items.forEach((el, i) => { el.style.setProperty("--d", `${(i % 4) * 70}ms`); io.observe(el); });
} else {
  items.forEach((el) => el.classList.add("in"));
}

// ---------- Barra de progreso de lectura (solo en posts) ----------
if (postParts.length) {
  const bar = document.createElement("div");
  bar.className = "progress";
  document.body.appendChild(bar);
  const update = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? Math.min(scrollY / h, 1) : 0})`;
  };
  addEventListener("scroll", update, { passive: true });
  update();
}

// ---------- Fórmulas con KaTeX ----------
window.addEventListener("load", () => {
  if (window.renderMathInElement) {
    renderMathInElement(document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
      ],
    });
  }
});

// ---------- Demo: Collatz ----------
const collatzBtn = document.getElementById("collatz-btn");
if (collatzBtn) {
  const run = () => {
    let n = parseInt(document.getElementById("collatz-input").value, 10);
    const out = document.getElementById("collatz-out");
    out.style.whiteSpace = "pre-wrap";
    if (!Number.isInteger(n) || n < 1 || n > 1e9) {
      out.textContent = "Ingresa un entero entre 1 y 1,000,000,000.";
      return;
    }
    const seq = [n];
    while (n !== 1) {
      n = n % 2 === 0 ? n / 2 : 3 * n + 1;
      seq.push(n);
    }
    const preview = seq.length > 40 ? seq.slice(0, 40).join(" → ") + " → …" : seq.join(" → ");
    out.textContent = `${seq.length - 1} pasos · máximo ${Math.max(...seq)}\n${preview}`;
  };
  collatzBtn.addEventListener("click", run);
  document.getElementById("collatz-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") run();
  });
}

// ---------- Demo: Criba de Eratóstenes ----------
const sieveBtn = document.getElementById("sieve-btn");
if (sieveBtn) {
  sieveBtn.addEventListener("click", () => {
    const n = parseInt(document.getElementById("sieve-input").value, 10);
    const out = document.getElementById("sieve-out");
    out.style.whiteSpace = "pre-wrap";
    if (!Number.isInteger(n) || n < 2 || n > 100000) {
      out.textContent = "Ingresa un entero entre 2 y 100,000.";
      return;
    }
    const isPrime = new Uint8Array(n + 1).fill(1);
    isPrime[0] = isPrime[1] = 0;
    for (let i = 2; i * i <= n; i++) {
      if (isPrime[i]) for (let j = i * i; j <= n; j += i) isPrime[j] = 0;
    }
    const primes = [];
    isPrime.forEach((v, i) => v && primes.push(i));
    out.textContent = `${primes.length} primos ≤ ${n}\n` +
      (primes.length > 80 ? primes.slice(0, 80).join(", ") + ", …" : primes.join(", "));
  });
}

// ---------- Demo: Graficador de funciones ----------
const plotBtn = document.getElementById("plot-btn");
if (plotBtn) {
  const canvas = document.getElementById("plot-canvas");
  const ctx = canvas.getContext("2d");
  const input = document.getElementById("plot-input");
  const out = document.getElementById("plot-out");

  // Convierte "sin(x)^2 + pi" en JS seguro (solo x, números, operadores y funciones de Math)
  function compile(expr) {
    const allowed = /^(?:[0-9.\s+\-*/^(),x]|sin|cos|tan|sqrt|abs|log|exp|pi|e(?![a-z]))*$/;
    if (!allowed.test(expr)) throw new Error("Expresión no válida");
    const js = expr
      .replace(/\^/g, "**")
      .replace(/\b(sin|cos|tan|sqrt|abs|log|exp)\b/g, "Math.$1")
      .replace(/\bpi\b/g, "Math.PI")
      .replace(/\be\b/g, "Math.E");
    return new Function("x", `"use strict"; return (${js});`);
  }

  function draw() {
    out.textContent = "";
    let f;
    try { f = compile(input.value.toLowerCase()); f(0); }
    catch (e) { out.textContent = "No pude interpretar esa expresión."; return; }

    const W = canvas.width, H = canvas.height, R = 6; // rango x ∈ [-6, 6]
    const style = getComputedStyle(root);
    const fg = style.getPropertyValue("--text").trim();
    const muted = style.getPropertyValue("--border").trim();
    const accent = style.getPropertyValue("--accent").trim();
    ctx.clearRect(0, 0, W, H);

    const sx = W / (2 * R), sy = sx;
    ctx.strokeStyle = muted; ctx.lineWidth = 1;
    for (let k = -R; k <= R; k++) {
      ctx.beginPath(); ctx.moveTo(W / 2 + k * sx, 0); ctx.lineTo(W / 2 + k * sx, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, H / 2 - k * sy); ctx.lineTo(W, H / 2 - k * sy); ctx.stroke();
    }
    ctx.strokeStyle = fg; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
    ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();

    // Curva animada: se dibuja de izquierda a derecha
    ctx.strokeStyle = accent; ctx.lineWidth = 2.5; ctx.lineJoin = "round";
    let px = 0, started = false;
    ctx.beginPath();
    function step() {
      const end = Math.min(px + 12, W);
      for (; px <= end; px++) {
        const x = (px - W / 2) / sx, y = f(x);
        const py = H / 2 - y * sy;
        if (!Number.isFinite(y) || Math.abs(py) > H * 3) { started = false; continue; }
        started ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        started = true;
      }
      ctx.stroke();
      if (px <= W) requestAnimationFrame(step);
    }
    step();
  }
  plotBtn.addEventListener("click", draw);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") draw(); });
  draw();
}

// =====================================================================
// Animaciones estilo epic.net (JS puro: sin GSAP)
// =====================================================================
const html = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Texto dividido en palabras (como SplitText) ----------
function splitWords(el) {
  if (el.textContent.includes("$")) return; // no romper fórmulas KaTeX
  const words = el.textContent.trim().split(/\s+/);
  el.setAttribute("aria-label", el.textContent.trim());
  el.innerHTML = words
    .map((w, i) => `<span class="w" aria-hidden="true"><span class="wi" style="--i:${i}">${w}</span></span>`)
    .join(" ");
}
document.querySelectorAll("[data-split], .post h1").forEach(splitWords);

// ---------- Carga inicial con contador ----------
function setReady() { html.classList.add("ready"); }

const loader = document.querySelector(".loader");
if (html.classList.contains("loading") && loader && !reduceMotion) {
  const countEl = loader.querySelector(".count");
  const dur = 1500, t0 = performance.now();
  (function tick(now) {
    const p = Math.min((now - t0) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    countEl.textContent = Math.round(eased * 100);
    if (p < 1) return requestAnimationFrame(tick);
    loader.classList.add("done");
    setTimeout(() => {
      html.classList.remove("loading");
      setReady();
    }, 450);
    setTimeout(() => loader.remove(), 1300);
    try { sessionStorage.setItem("seen", "1"); } catch (e) {}
  })(t0);
} else {
  html.classList.remove("loading");
  try { sessionStorage.setItem("seen", "1"); } catch (e) {}
  // si venimos de una transición, esperar a que la cortina suba
  setTimeout(setReady, html.classList.contains("nav-in") ? 450 : 80);
}

// ---------- Transición de página con cortina ----------
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href]");
  if (!a || reduceMotion) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  if (a.target === "_blank" || a.hasAttribute("download")) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return;
  if (url.pathname === location.pathname && url.hash) return; // ancla en la misma página
  e.preventDefault();
  try { sessionStorage.setItem("nav", "1"); } catch (err) {}
  html.classList.add("nav-out");
  setTimeout(() => { location.href = a.href; }, 650);
});
addEventListener("pageshow", (e) => {
  if (e.persisted) { html.classList.remove("nav-out", "nav-in"); setReady(); }
});

// ---------- Cursor personalizado ----------
if (matchMedia("(hover: hover) and (pointer: fine)").matches && !reduceMotion) {
  const cursor = document.createElement("div");
  cursor.className = "cursor";
  document.body.appendChild(cursor);
  html.classList.add("has-cursor");

  let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
  addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  (function follow() {
    cx += (mx - cx) * 0.2;
    cy += (my - cy) * 0.2;
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(follow);
  })();

  document.addEventListener("mouseover", (e) => {
    const entry = e.target.closest(".entry");
    const link = e.target.closest("a, button, input");
    cursor.classList.toggle("view", !!entry);
    cursor.classList.toggle("link", !entry && !!link);
    cursor.textContent = entry ? "Leer" : "";
  });
  document.addEventListener("mouseleave", () => { cursor.style.opacity = 0; });
  document.addEventListener("mouseenter", () => { cursor.style.opacity = 1; });
}
