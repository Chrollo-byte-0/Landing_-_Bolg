const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist");
const localServer = path.join(root, "js", "server.js");
const isVercel = Boolean(process.env.VERCEL);
const staticOnly = process.env.STATIC_ONLY === "true" || process.argv.includes("--static-only");

function serviceUrl(name, fallback) {
  if (staticOnly) return "";

  const value = process.env[name];
  if (!value) {
    if (isVercel) {
      throw new Error(`${name} must be configured in the Vercel project.`);
    }
    return fallback;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute HTTP(S) URL.`);
  }
  if (!["http:", "https:"].includes(url.protocol) || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${name} must be an HTTP(S) service origin without a path.`);
  }
  if (isVercel && url.protocol !== "https:") {
    throw new Error(`${name} must use HTTPS on Vercel.`);
  }
  return url.origin;
}

const replacements = [
  ["http://localhost:8013", serviceUrl("BUILDER_URL", "http://localhost:8013")],
  ["http://localhost:8012", serviceUrl("METRICS_URL", "http://localhost:8012")],
];
const analyticsScripts = [
  '<script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>',
  '<script defer src="/_vercel/insights/script.js"></script>',
].join("\n");

function copySite(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if ([".git", ".vercel", "api", "dist", "node_modules", "package-lock.json", "package.json", "rosario-blog", "deploy", "test"].includes(entry.name)) {
      continue;
    }

    const sourcePath = path.join(source, entry.name);
    if (sourcePath === localServer) continue;
    if (staticOnly && entry.name === "metrics.js") continue;
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copySite(sourcePath, destinationPath);
      continue;
    }
    if (!entry.isFile()) continue;

    if (entry.name.endsWith(".html")) {
      let html = fs.readFileSync(sourcePath, "utf8");
      for (const [from, to] of replacements) html = html.replaceAll(from, to);
      if (staticOnly) {
        html = html.replace(/<script\b(?=[^>]*\bsrc=["'][^"']*metrics\.js(?:\?[^"']*)?["'])[^>]*>\s*<\/script>/gi, "");
        html = html.replace(
          /<form\b(?=[^>]*\bid=["']contact-form["'])[\s\S]*?<\/form>/i,
          '<p class="contact-static-notice">El formulario no está disponible en esta versión estática. Puedes escribirme por correo.</p>'
        );
      }
      if (isVercel) html = html.replace(/<\/head>/i, analyticsScripts + "\n</head>");
      fs.writeFileSync(destinationPath, html);
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

fs.rmSync(output, { recursive: true, force: true });
copySite(root, output);
