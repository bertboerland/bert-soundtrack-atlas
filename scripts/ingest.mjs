#!/usr/bin/env node
/**
 * Spotify Extended Streaming History → processed dataset.
 *
 * Usage:
 *   npm run ingest
 *
 * Reads:
 *   data/Streaming_History_Audio_*.json   (drop your Spotify exports here)
 *
 * Writes:
 *   public/data/processed.json            (consumed by the frontend)
 *
 * Optional env:
 *   SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET — enables genre enrichment via
 *   the public Spotify Web API (Client Credentials flow). Without these the
 *   pipeline still produces a complete dataset, just with genre="Unknown".
 */

import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const OUT_DIR = path.join(ROOT, "public", "data");
const OUT_FILE = path.join(OUT_DIR, "processed.json");

const MIN_MS_PLAYED = 30_000; // ignore <30s skips

async function loadRecords() {
  let files;
  try {
    files = await readdir(DATA_DIR);
  } catch {
    console.error(`✗ data/ directory not found at ${DATA_DIR}`);
    console.error("  Place your Spotify Streaming_History_Audio_*.json files there.");
    process.exit(1);
  }

  const targets = files.filter(
    (f) => /^Streaming_History_Audio.*\.json$/i.test(f),
  );
  if (targets.length === 0) {
    console.error("✗ No Streaming_History_Audio_*.json files found in data/");
    process.exit(1);
  }

  const all = [];
  for (const f of targets) {
    const txt = await readFile(path.join(DATA_DIR, f), "utf8");
    const arr = JSON.parse(txt);
    all.push(...arr);
    console.log(`  ✓ loaded ${f} (${arr.length.toLocaleString()} records)`);
  }
  return all;
}

function normalize(records) {
  return records.filter(
    (r) =>
      r.master_metadata_track_name &&
      r.master_metadata_album_artist_name &&
      r.spotify_track_uri &&
      (r.ms_played ?? 0) >= MIN_MS_PLAYED,
  );
}

function aggregate(records) {
  const trackMap = new Map();
  const artistMap = new Map();
  const heatmap = new Map();

  for (const r of records) {
    const trackId = r.spotify_track_uri;
    const name = r.master_metadata_track_name;
    const artist = r.master_metadata_album_artist_name;
    const album = r.master_metadata_album_album_name ?? "";
    const ts = new Date(r.ts);
    const year = ts.getUTCFullYear();
    const date = ts.toISOString().slice(0, 10);
    const hour = ts.getUTCHours();

    // Tracks
    let t = trackMap.get(trackId);
    if (!t) {
      t = {
        trackId,
        name,
        artist,
        album,
        msPlayed: 0,
        plays: 0,
        firstPlayed: r.ts,
        lastPlayed: r.ts,
        yearsActive: new Set(),
        genre: "Unknown",
      };
      trackMap.set(trackId, t);
    }
    t.msPlayed += r.ms_played;
    t.plays += 1;
    if (r.ts < t.firstPlayed) t.firstPlayed = r.ts;
    if (r.ts > t.lastPlayed) t.lastPlayed = r.ts;
    t.yearsActive.add(year);

    // Artists
    let a = artistMap.get(artist);
    if (!a) {
      a = {
        artist,
        msPlayed: 0,
        plays: 0,
        uniqueTracks: new Set(),
        yearsActive: new Set(),
        topGenre: "Unknown",
      };
      artistMap.set(artist, a);
    }
    a.msPlayed += r.ms_played;
    a.plays += 1;
    a.uniqueTracks.add(trackId);
    a.yearsActive.add(year);

    // Heatmap
    const hk = `${date}|${hour}`;
    const hCell = heatmap.get(hk) ?? { date, hour, minutes: 0 };
    hCell.minutes += r.ms_played / 60000;
    heatmap.set(hk, hCell);
  }

  // Materialize
  const tracks = [...trackMap.values()]
    .map((t) => ({
      ...t,
      yearsActive: [...t.yearsActive].sort(),
    }))
    .sort((a, b) => b.msPlayed - a.msPlayed);

  const artists = [...artistMap.values()]
    .map((a) => ({
      ...a,
      uniqueTracks: a.uniqueTracks.size,
      yearsActive: [...a.yearsActive].sort(),
    }))
    .sort((a, b) => b.msPlayed - a.msPlayed);

  const heatmapArr = [...heatmap.values()].map((c) => ({
    ...c,
    minutes: Math.round(c.minutes),
  }));

  return { tracks, artists, heatmapArr, artistMap, trackMap };
}

function buildGenreEvolution(records, artistMap) {
  const genreYear = new Map();
  for (const r of records) {
    const year = new Date(r.ts).getUTCFullYear();
    const artist = artistMap.get(r.master_metadata_album_artist_name);
    const genre = artist?.topGenre ?? "Unknown";
    const k = `${year}|${genre}`;
    const cur = genreYear.get(k) ?? { year, genre, minutes: 0 };
    cur.minutes += r.ms_played / 60000;
    genreYear.set(k, cur);
  }
  return [...genreYear.values()].map((g) => ({
    ...g,
    minutes: Math.round(g.minutes),
  }));
}

function findObsessions(records) {
  // Detect tracks played 20+ times within any 7-day window.
  const byTrack = new Map();
  for (const r of records) {
    const id = r.spotify_track_uri;
    if (!id) continue;
    if (!byTrack.has(id)) byTrack.set(id, []);
    byTrack.get(id).push({ ts: new Date(r.ts).getTime(), record: r });
  }

  const obsessions = [];
  for (const [id, plays] of byTrack) {
    if (plays.length < 20) continue;
    plays.sort((a, b) => a.ts - b.ts);
    let bestStart = plays[0];
    let bestCount = 0;
    let l = 0;
    for (let r = 0; r < plays.length; r++) {
      while (plays[r].ts - plays[l].ts > 7 * 86400000) l++;
      const window = r - l + 1;
      if (window > bestCount) {
        bestCount = window;
        bestStart = plays[l];
      }
    }
    if (bestCount >= 20) {
      obsessions.push({
        trackId: id,
        name: bestStart.record.master_metadata_track_name,
        artist: bestStart.record.master_metadata_album_artist_name,
        weekStart: new Date(bestStart.ts).toISOString().slice(0, 10),
        plays: bestCount,
      });
    }
  }
  return obsessions.sort((a, b) => b.plays - a.plays).slice(0, 30);
}

function findSurvivors(tracks) {
  return tracks
    .filter((t) => t.yearsActive.length >= 5)
    .slice(0, 30)
    .map((t) => ({
      trackId: t.trackId,
      name: t.name,
      artist: t.artist,
      yearsActive: t.yearsActive,
      totalPlays: t.plays,
      totalMinutes: Math.round(t.msPlayed / 60000),
    }));
}

function buildInsights(meta, tracks, artists) {
  const out = [];
  const topArtist = artists[0];
  if (topArtist) {
    out.push({
      id: "top-artist",
      headline: `${topArtist.artist} dominates your library.`,
      body: `${Math.round(topArtist.msPlayed / 60000).toLocaleString()} minutes across ${topArtist.uniqueTracks} unique tracks and ${topArtist.yearsActive.length} years.`,
      metric: `${Math.round((topArtist.msPlayed / (meta.totalMinutes * 60000)) * 100)}%`,
      tone: "obsession",
    });
  }
  const longLasting = artists.find((a) => a.yearsActive.length >= 5);
  if (longLasting) {
    out.push({
      id: "long-lasting",
      headline: `${longLasting.artist} has stayed with you for ${longLasting.yearsActive.length} years.`,
      body: `From ${longLasting.yearsActive[0]} to ${longLasting.yearsActive[longLasting.yearsActive.length - 1]} — a true constant.`,
      metric: `${longLasting.yearsActive.length}y`,
      tone: "ritual",
    });
  }
  out.push({
    id: "library-size",
    headline: `You've explored ${meta.totalArtists.toLocaleString()} artists.`,
    body: `${meta.totalTracks.toLocaleString()} unique tracks logged across ${meta.yearRange[1] - meta.yearRange[0] + 1} years of listening.`,
    metric: meta.totalArtists.toLocaleString(),
    tone: "discovery",
  });
  return out;
}

function buildGalaxy(tracks) {
  // Genre hue palette
  const hueOf = (genre) => {
    let h = 0;
    for (let i = 0; i < genre.length; i++) h = (h * 31 + genre.charCodeAt(i)) % 360;
    return h;
  };
  const artistClusters = new Map();
  let cIdx = 0;
  return tracks.slice(0, 250).map((t) => {
    if (!artistClusters.has(t.artist)) artistClusters.set(t.artist, cIdx++);
    const cluster = artistClusters.get(t.artist);
    const ca = (cluster / Math.max(1, cIdx)) * Math.PI * 2;
    const cb = ((cluster * 1.7) % Math.PI) - Math.PI / 2;
    const cr = 5 + (cluster % 4) * 0.6;
    const cx = Math.cos(ca) * Math.cos(cb) * cr;
    const cy = Math.sin(cb) * cr;
    const cz = Math.sin(ca) * Math.cos(cb) * cr;
    const lastYear = t.yearsActive[t.yearsActive.length - 1];
    return {
      id: t.trackId,
      name: t.name,
      artist: t.artist,
      size: 0.05 + Math.log10(1 + t.plays) * 0.07,
      hue: hueOf(t.genre),
      brightness: Math.max(0.15, Math.min(1, (lastYear - 2009) / 17)),
      cluster,
      x: cx + (Math.random() - 0.5) * 1.4,
      y: cy + (Math.random() - 0.5) * 1.4,
      z: cz + (Math.random() - 0.5) * 1.4,
    };
  });
}

function classifyPlatform(p) {
  if (!p) return "Unknown";
  const s = String(p).toLowerCase();
  if (s.includes("ios") || s.includes("iphone") || s.includes("ipad")) return "iOS";
  if (s.includes("os x") || s.includes("osx") || s.includes("macos")) return "macOS";
  if (s.includes("cast") || s.includes("chromecast") || s.includes("sonos")) return "Cast / Speaker";
  if (s.includes("android")) return "Android";
  if (s.includes("windows") || s.includes("win32")) return "Windows";
  if (s.includes("linux")) return "Linux";
  if (s.includes("web") || s.includes("webplayer") || s.includes("chrome")) return "Web";
  if (s.includes("partner")) return "Cast / Speaker";
  return "Other";
}

function buildClientTimeline(records) {
  const map = new Map(); // key: YYYY-MM|platform → minutes
  for (const r of records) {
    const month = r.ts.slice(0, 7);
    const platform = classifyPlatform(r.platform);
    const key = `${month}|${platform}`;
    map.set(key, (map.get(key) ?? 0) + r.ms_played / 60000);
  }
  return [...map.entries()].map(([k, minutes]) => {
    const [month, platform] = k.split("|");
    return { month, platform, minutes: Math.round(minutes) };
  });
}

async function enrichGenres(artists) {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) {
    console.log("  ⚠ Spotify API credentials not set — skipping genre enrichment.");
    return;
  }
  console.log("  ↻ enriching genres via Spotify Web API…");

  // 1. Get app token (Client Credentials)
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!tokenRes.ok) {
    console.log("  ✗ token request failed — skipping enrichment");
    return;
  }
  const { access_token } = await tokenRes.json();

  // 2. Enrich the top N artists (most-played first). The galaxy + streamgraph
  //    only need the heavy hitters, and we want to stay well within rate limits.
  const TOP_N = Math.min(artists.length, 600);
  let enriched = 0;
  for (let i = 0; i < TOP_N; i++) {
    const a = artists[i];
    try {
      const q = encodeURIComponent(`artist:"${a.artist.replace(/"/g, "")}"`);
      const sr = await fetch(
        `https://api.spotify.com/v1/search?type=artist&limit=1&q=${q}`,
        { headers: { Authorization: `Bearer ${access_token}` } },
      );
      if (sr.status === 429) {
        const wait = Number(sr.headers.get("retry-after") ?? 2);
        await new Promise((r) => setTimeout(r, (wait + 1) * 1000));
        i--;
        continue;
      }
      if (!sr.ok) continue;
      const data = await sr.json();
      const hit = data.artists?.items?.[0];
      if (hit && hit.genres && hit.genres.length > 0) {
        // Pick the most "umbrella" genre — shortest tends to be broadest.
        a.topGenre = hit.genres.sort((x, y) => x.length - y.length)[0];
        enriched++;
      }
    } catch {
      /* skip */
    }
    if (i % 50 === 0 && i > 0) {
      console.log(`    · ${i}/${TOP_N} artists processed (${enriched} enriched)`);
    }
  }
  console.log(`  ✓ enriched ${enriched}/${TOP_N} artists with genre data`);
}

async function main() {
  console.log("→ Soundtrack of Bert · ingest pipeline\n");

  const raw = await loadRecords();
  console.log(`\n  total raw records: ${raw.length.toLocaleString()}`);
  const records = normalize(raw);
  console.log(`  after normalization: ${records.length.toLocaleString()}\n`);

  const { tracks, artists, heatmapArr, artistMap } = aggregate(records);
  await enrichGenres(artists);

  // Backfill track.genre from the (possibly enriched) artist.topGenre
  for (const t of tracks) {
    const a = artistMap.get(t.artist);
    if (a?.topGenre) t.genre = a.topGenre;
  }

  const genreEvolution = buildGenreEvolution(records, artistMap);
  const clientTimeline = buildClientTimeline(records);

  const meta = {
    generatedAt: new Date().toISOString(),
    totalStreams: records.length,
    totalMinutes: Math.round(records.reduce((a, r) => a + r.ms_played, 0) / 60000),
    totalTracks: tracks.length,
    totalArtists: artists.length,
    yearRange: [
      Math.min(...tracks.flatMap((t) => t.yearsActive)),
      Math.max(...tracks.flatMap((t) => t.yearsActive)),
    ],
  };

  const dataset = {
    meta,
    topTracks: tracks.slice(0, 200),
    topArtists: artists.slice(0, 100),
    genreEvolution,
    heatmap: heatmapArr,
    obsessions: findObsessions(records),
    survivors: findSurvivors(tracks),
    insights: buildInsights(meta, tracks, artists),
    galaxyNodes: buildGalaxy(tracks),
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(dataset));
  const sizeKb = Math.round((await readFile(OUT_FILE)).length / 1024);

  console.log(`✓ wrote ${path.relative(ROOT, OUT_FILE)} (${sizeKb} KB)`);
  console.log(
    `  ${meta.totalStreams.toLocaleString()} streams · ${meta.totalTracks.toLocaleString()} tracks · ${meta.totalArtists.toLocaleString()} artists · ${meta.yearRange[0]}→${meta.yearRange[1]}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
