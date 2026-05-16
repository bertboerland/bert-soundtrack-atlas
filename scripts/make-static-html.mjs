#!/usr/bin/env node
/**
 * Post-build: generate a static index.html in dist/client/ so the app
 * can be served as a pure SPA from any static file host (Apache, nginx, S3).
 *
 * Reads dist/client/.vite/manifest.json, finds all `isEntry` chunks plus
 * their CSS imports, and writes an HTML shell that boots the client router.
 *
 * Set BASE_PATH env var if hosting under a subpath, e.g.:
 *   BASE_PATH=/spotify26/ npm run build && node scripts/make-static-html.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist/client";
const BASE = (process.env.BASE_PATH || "/").replace(/\/?$/, "/");
const manifestPath = join(DIST, ".vite/manifest.json");

if (!existsSync(manifestPath)) {
  console.error(`✗ ${manifestPath} not found. Run \`npm run build\` first.`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const scripts = new Set();
const styles = new Set();

function collect(chunk) {
  if (!chunk) return;
  if (chunk.file && chunk.file.endsWith(".js")) scripts.add(chunk.file);
  for (const css of chunk.css || []) styles.add(css);
  for (const imp of chunk.imports || []) collect(manifest[imp]);
}

// All entry chunks (TanStack Start usually emits one client entry).
for (const key of Object.keys(manifest)) {
  if (manifest[key].isEntry) collect(manifest[key]);
}

if (scripts.size === 0) {
  console.error("✗ No entry chunks found in manifest.");
  process.exit(1);
}

const styleTags = [...styles]
  .map((href) => `    <link rel="stylesheet" href="${BASE}${href}">`)
  .join("\n");

const scriptTags = [...scripts]
  .map((src) => `    <script type="module" src="${BASE}${src}"></script>`)
  .join("\n");

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>The Soundtrack of Bert</title>
    <meta name="description" content="A living map of years, obsessions, rhythms and sonic memories — Bert Boerland's interactive musical autobiography." />
    <meta name="theme-color" content="#1DB954" />
    <meta property="og:title" content="The Soundtrack of Bert" />
    <meta property="og:description" content="A living map of years, obsessions, rhythms and sonic memories." />
    <meta property="og:image" content="${BASE}og-image.jpg" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="${BASE}" />
${styleTags}
  </head>
  <body>
    <div id="root"></div>
${scriptTags}
  </body>
</html>
`;

writeFileSync(join(DIST, "index.html"), html);
console.log(`✓ Wrote ${DIST}/index.html  (base="${BASE}")`);
console.log(`  scripts: ${[...scripts].join(", ")}`);
console.log(`  styles:  ${[...styles].join(", ") || "(none)"}`);
