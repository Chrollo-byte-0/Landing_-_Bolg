const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist");
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
    if ([".git", ".vercel", "dist", "node_modules", "deploy", "package.json", "package-lock.json"].includes(entry.name)) {
      continue;
    }

    const sourcePath = path.join(source, entry.name);
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

const domPurify = path.join(root, "node_modules", "dompurify", "dist", "purify.min.js");
if (!fs.existsSync(domPurify)) {
  throw new Error("DOMPurify is required to safely render blog content. Run npm install in Blog.");
}
const vendorDirectory = path.join(output, "js", "vendor");
fs.mkdirSync(vendorDirectory, { recursive: true });
fs.copyFileSync(domPurify, path.join(vendorDirectory, "dompurify.min.js"));
