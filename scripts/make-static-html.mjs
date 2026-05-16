#!/usr/bin/env node
/**
 * Post-build: generate a static index.html in dist/client/ that boots the
 * SPA entry (src/client-spa.tsx) instead of TanStack Start's SSR hydrator.
 *
 * Reads dist/client/.vite/manifest.json, picks the client-spa entry plus
 * all its CSS, and writes an HTML shell.
 *
 *   BASE_PATH=/spotify26/ npm run build:static
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

// Find our SPA entry (keyed as "src/client-spa.tsx" in the manifest).
const entryKey = Object.keys(manifest).find(
  (k) => k.endsWith("client-spa.tsx") && manifest[k].isEntry,
);
if (!entryKey) {
  console.error(
    "✗ client-spa entry not found in manifest. Did vite.config rollupOptions.input include it?",
  );
  console.error("  Entries seen:", Object.keys(manifest).filter((k) => manifest[k].isEntry));
  process.exit(1);
}

const scripts = new Set();
const styles = new Set();
const seen = new Set();

function collect(chunk) {
  if (!chunk || seen.has(chunk.file)) return;
  seen.add(chunk.file);
  if (chunk.file && chunk.file.endsWith(".js")) scripts.add(chunk.file);
  for (const css of chunk.css || []) styles.add(css);
  for (const imp of chunk.imports || []) collect(manifest[imp]);
}

collect(manifest[entryKey]);

const styleTags = [...styles]
  .map((href) => `    <link rel="stylesheet" href="${BASE}${href}">`)
  .join("\n");

// Entry script must be last so its imports are already preloaded.
const entryFile = manifest[entryKey].file;
const otherScripts = [...scripts].filter((s) => s !== entryFile);
const scriptTags = [
  ...otherScripts.map((src) => `    <link rel="modulepreload" href="${BASE}${src}">`),
  `    <script type="module" src="${BASE}${entryFile}"></script>`,
].join("\n");

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
console.log(`✓ Wrote ${DIST}/index.html  (base="${BASE}", entry="${entryFile}")`);
