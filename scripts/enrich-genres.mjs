#!/usr/bin/env node
/**
 * Enrich an existing public/data/processed.json with Last.fm genres,
 * without needing the raw Streaming_History_Audio_*.json files.
 */
import { readFile, writeFile } from "node:fs/promises";
import "dotenv/config";

const FILE = "public/data/processed.json";

const GENRE_UMBRELLAS = [
  [/hip.?hop|rap|trap|grime/i, "Hip-Hop"],
  [/r&?b|soul|funk|motown/i, "Soul & R&B"],
  [/jazz|bebop|swing|bossa/i, "Jazz"],
  [/class(ical|ic)|orchestr|baroque|opera|symphon/i, "Classical"],
  [/metal|hardcore|grindcore|doom/i, "Metal"],
  [/punk/i, "Punk"],
  [/folk|singer.?songwriter|americana|country|bluegrass/i, "Folk & Country"],
  [/electro|house|techno|trance|dnb|drum.?and.?bass|dubstep|edm|idm|ambient|downtempo|chillout|trip.?hop|big.?beat/i, "Electronic"],
  [/indie|alt(ernative)?/i, "Indie / Alternative"],
  [/rock|garage|grunge|britpop/i, "Rock"],
  [/pop/i, "Pop"],
  [/reggae|ska|dub/i, "Reggae"],
  [/world|latin|afro|reggaeton|salsa|cumbia/i, "World"],
  [/blues/i, "Blues"],
  [/sound.?track|score|film/i, "Soundtrack"],
];
const umbrellaFor = (t) => {
  for (const [re, l] of GENRE_UMBRELLAS) if (re.test(t)) return l;
  return null;
};

const key = process.env.LASTFM_API_KEY;
if (!key) { console.error("LASTFM_API_KEY missing"); process.exit(1); }

const ds = JSON.parse(await readFile(FILE, "utf8"));
const TOP_N = Math.min(ds.topArtists.length, 600);
console.log(`Enriching ${TOP_N} artists via Last.fm…`);

let enriched = 0;
for (let i = 0; i < TOP_N; i++) {
  const a = ds.topArtists[i];
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(a.artist)}&api_key=${key}&format=json&autocorrect=1`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = await res.json();
    const tags = data?.artist?.tags?.tag ?? [];
    if (!tags.length) continue;
    let chosen = null;
    for (const t of tags) { const u = umbrellaFor(t.name); if (u) { chosen = u; break; } }
    if (!chosen) chosen = tags[0].name.replace(/\b\w/g, (c) => c.toUpperCase());
    a.topGenre = chosen;
    enriched++;
  } catch {}
  if (i % 50 === 0 && i > 0) console.log(`  · ${i}/${TOP_N} (${enriched} enriched)`);
}
console.log(`✓ enriched ${enriched}/${TOP_N}`);

// Backfill genre on top tracks via artist lookup
const artistGenre = new Map(ds.topArtists.map((a) => [a.artist, a.topGenre]));
for (const t of ds.topTracks) {
  const g = artistGenre.get(t.artist);
  if (g) t.genre = g;
}

// Rebuild genreEvolution from topArtists × yearsActive distribution
// (We don't have per-stream timestamps anymore, so approximate by spreading
// each artist's total minutes evenly over their active years.)
const byYearGenre = new Map();
for (const a of ds.topArtists) {
  if (!a.yearsActive?.length) continue;
  const perYear = (a.msPlayed / 60000) / a.yearsActive.length;
  for (const y of a.yearsActive) {
    const k = `${y}|${a.topGenre}`;
    byYearGenre.set(k, (byYearGenre.get(k) ?? 0) + perYear);
  }
}
ds.genreEvolution = [...byYearGenre.entries()].map(([k, m]) => {
  const [year, genre] = k.split("|");
  return { year: Number(year), genre, minutes: Math.round(m) };
});

await writeFile(FILE, JSON.stringify(ds));
console.log(`✓ wrote ${FILE}`);
